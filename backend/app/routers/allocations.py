from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.get("/metrics")
def allocation_metrics():
    """
    Returns all 6 info-card metrics for the Allocation page:
    Total Resources, Billable, Non-Billable, Bench Strength,
    Avg Utilization, and Overallocated count.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Total Resources — all employees
        cur.execute("SELECT COUNT(*) FROM employee_master")
        total_resources = cur.fetchone()[0]

        # 2. Billable Count — distinct employees tagged 'Allocated - Billable'
        cur.execute("""
            SELECT COUNT(DISTINCT employee_id)
            FROM projects_allocation
            WHERE LOWER(project_tags) = 'billable'
        """)
        billable_count = cur.fetchone()[0]

        # 3. Non-Billable Count — distinct employees tagged 'Allocated - Non-Billable'
        cur.execute("""
            SELECT COUNT(DISTINCT employee_id)
            FROM projects_allocation
            WHERE LOWER(project_tags) = 'non-billable'
        """)
        non_billable_count = cur.fetchone()[0]

        # 4. Bench Strength
        cur.execute("""
            SELECT COUNT(*)
            FROM employee_master_pro
            WHERE employee_status = 'Bench'
        """)
        bench_strength = cur.fetchone()[0]

        # 5. Avg Utilization (Total Allocation % / Total Resources)
        cur.execute("""
            SELECT COALESCE(SUM(allocation_percentage), 0) / (SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE COUNT(*) END FROM employee_master)
            FROM projects_allocation
        """)
        avg_utilization = round(float(cur.fetchone()[0]), 2)

        # 6. Overallocated — employees in multiple projects, all billable
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT employee_id
                FROM projects_allocation
                WHERE LOWER(project_tags) = 'billable'
                GROUP BY employee_id
                HAVING COUNT(DISTINCT project_id) > 1
                   AND COUNT(*) = COUNT(CASE WHEN LOWER(project_tags) = 'billable' THEN 1 END)
            ) overalloc
        """)
        overallocated = cur.fetchone()[0]

        return {
            "totalResources": {"value": total_resources, "label": "Total Resources"},
            "billable":       {"value": billable_count,   "label": "Billable Count"},
            "nonBillable":    {"value": non_billable_count, "label": "Non-Billable"},
            "benchStrength":  {"value": bench_strength,   "label": "Bench Strength"},
            "avgUtilization": {"value": f"{avg_utilization}%", "label": "Avg Utilization"},
            "overallocated":  {"value": overallocated,    "label": "Overallocated", "isAlert": overallocated > 0}
        }

    except Exception as e:
        print("Allocation metrics DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/projects")
def allocation_projects():
    """
    Returns all projects with their billable and non-billable employee counts.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                pa.project_id,
                p.project_name,
                COUNT(DISTINCT CASE WHEN LOWER(pa.project_tags) = 'billable' THEN pa.employee_id END) AS billable_count,
                COUNT(DISTINCT CASE WHEN LOWER(pa.project_tags) = 'non-billable' THEN pa.employee_id END) AS non_billable_count
            FROM projects_allocation pa
            JOIN projects p ON pa.project_id = p.project_id
            GROUP BY pa.project_id, p.project_name
            ORDER BY p.project_name
        """)

        rows = cur.fetchall()

        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "billable_count": r[2],
                "non_billable_count": r[3]
            }
            for r in rows
        ]

    except Exception as e:
        print("Allocation projects DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/projects/{project_id}/employees")
def project_employees(project_id: str):
    """
    Returns employees allocated to a specific project with allocation % and tag.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                pa.employee_id,
                em.employee_name,
                (pa.allocation_percentage) AS allocation_pct,
                pa.project_tags
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.project_id = %s
            ORDER BY em.employee_name
        """, (project_id,))

        rows = cur.fetchall()

        return [
            {
                "employee_id": r[0],
                "employee_name": r[1],
                "allocation_percentage": int(r[2]),
                "project_tags": r[3]
            }
            for r in rows
        ]

    except Exception as e:
        print("Project employees DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/organization")
def organization_utilization():
    """
    Returns organization-wide utilization and breakdown.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Avg Utilization
        cur.execute("SELECT COALESCE(AVG(allocation_percentage), 0) FROM projects_allocation")
        avg_util = float(cur.fetchone()[0])

        # 2. Breakdown by employee status
        cur.execute("""
            SELECT employee_status, COUNT(*) 
            FROM employee_master_pro 
            GROUP BY employee_status
        """)
        rows = cur.fetchall()
        
        # Mapping statuses to colors (matching OrganizationUtilization.jsx)
        color_map = {
            "Bench": "#94a3b8",
            "Billable": "#60a5fa",
            "Internal": "#c084fc",
            "Training": "#34d399"
        }
        
        breakdown = []
        for status, count in rows:
            if status: # Avoid empty status
                breakdown.append({
                    "label": status,
                    "value": count,
                    "color": color_map.get(status, "#cbd5e1") # default gray-300
                })

        return {
            "used": avg_util,
            "breakdown": breakdown
        }

    except Exception as e:
        print("Organization utilization DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/department-breakdown")
def department_allocation_breakdown():
    """
    Returns billable and non-billable employee counts per department with 3 categories:
    1. Allocated and Billable (Green)
    2. Allocated and Non-Billable (Blue)
    3. Not Allocated and Billable (Orange)
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Hierarchy:
        # 1: Allocated & Billable (>0% and 'billable' not 'non')
        # 2: Allocated & Non-Billable (>0% and 'nonbillable')
        # 3: Not Allocated & Billable (0% and 'billable' not 'non')
        cur.execute("""
            WITH EmpStatus AS (
                SELECT 
                    em.employee_id,
                    em.department,
                    CASE 
                        WHEN (pa.allocation_percentage > 0 
                            AND LOWER(pa.project_tags) LIKE '%billable%' 
                            AND LOWER(pa.project_tags) NOT LIKE '%non%') THEN 1

                        WHEN (pa.allocation_percentage > 0 
                            AND LOWER(pa.project_tags) LIKE '%nonbillable%') THEN 2

                        WHEN (pa.allocation_percentage = 0 
                            AND LOWER(pa.project_tags) LIKE '%billable%' 
                            AND LOWER(pa.project_tags) NOT LIKE '%non%') THEN 3

                        WHEN pa.employee_id IS NULL THEN 4   -- 👈 handles pure bench

                        ELSE 4
                    END as status_rank
                FROM employee_master em
                LEFT JOIN projects_allocation pa 
                    ON em.employee_id = pa.employee_id
            ),

            BestStatus AS (
                SELECT 
                    employee_id,
                    department,
                    MIN(status_rank) as top_rank
                FROM EmpStatus
                GROUP BY employee_id, department
            )

            SELECT 
                department,
                COUNT(CASE WHEN top_rank = 1 THEN 1 END) as allocated_billable,
                COUNT(CASE WHEN top_rank = 2 THEN 1 END) as allocated_non_billable,
                COUNT(CASE WHEN top_rank = 3 THEN 1 END) as not_allocated_billable,
                COUNT(CASE WHEN top_rank = 4 THEN 1 END) as bench   -- 👈 optional but recommended
            FROM BestStatus
            GROUP BY department
            ORDER BY department
        """)

        rows = cur.fetchall()

        return [
            {
                "department": r[0] if r[0] else "Unknown",
                "allocated_billable": r[1],
                "allocated_non_billable": r[2],
                "not_allocated_billable": r[3]
            }
            for r in rows
        ]

    except Exception as e:
        print("Department breakdown DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)



@router.get("/forecast-bench")
def get_forecast_bench():
    """
    Returns employees whose allocation is ending within the next 30 days.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT 
                em.employee_id,
                em.employee_name,
                em.role_designation,
                em.photo_url,
                p.project_name,
                pa.allocation_end_date
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            JOIN projects p ON pa.project_id = p.project_id
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
            ORDER BY pa.allocation_end_date ASC
        """)
        rows = cur.fetchall()
        return [
            {
                "employee_id": r[0],
                "employee_name": r[1],
                "role": r[2],
                "photo_url": r[3],
                "project_name": r[4],
                "end_date": r[5]
            }
            for r in rows
        ]
    except Exception as e:
        print("Forecast bench DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/possible-projects/{employee_id}")
def get_possible_projects(employee_id: str):
    """
    Finds projects that match the employee's skills and experience, 
    including complete skill requirements, history and fit analysis.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Get employee skills
        cur.execute("""
            SELECT es.skill_id, s.skill_name, es.proficiency_level, es.years_of_experience
            FROM employee_skills es
            JOIN skills s ON es.skill_id = s.skill_id
            WHERE es.employee_id = %s
        """, (employee_id,))
        emp_skills_rows = cur.fetchall()
        emp_skills = {r[0]: {"name": r[1], "proficiency": r[2], "experience": float(r[3])} for r in emp_skills_rows}

        if not emp_skills:
            return []

        # 2. Get active projects and their required skills
        cur.execute("""
            SELECT 
                p.project_id, 
                p.project_name, 
                p.project_status,
                ps.skill_id,
                s.skill_name
            FROM projects p
            JOIN project_skills ps ON p.project_id = ps.project_id
            JOIN skills s ON ps.skill_id = s.skill_id
            WHERE LOWER(p.project_status) IN ('running', 'in progress', 'live', 'active')
        """)
        
        project_data = {}
        for r in cur.fetchall():
            pid, pname, pstatus, sid, sname = r
            if pid not in project_data:
                project_data[pid] = {
                    "id": pid, 
                    "name": pname, 
                    "status": pstatus, 
                    "required_skills": []
                }
            project_data[pid]["required_skills"].append({"id": sid, "name": sname})

        # 3. Get employee project history
        cur.execute("""
            SELECT p.project_name, pa.role_in_project, pa.allocation_percentage, pa.allocation_start_date, pa.allocation_end_date
            FROM projects_allocation pa
            JOIN projects p ON pa.project_id = p.project_id
            WHERE pa.employee_id = %s
            ORDER BY pa.allocation_start_date DESC
            LIMIT 3
        """, (employee_id,))
        history_rows = cur.fetchall()
        project_history = [
            {
                "name": r[0],
                "role": r[1],
                "percentage": r[2],
                "start_date": r[3],
                "end_date": r[4]
            } for r in history_rows
        ]

        # 4. Match and Rank
        possible_projects = []
        for pid, data in project_data.items():
            req_skill_ids = [s["id"] for s in data["required_skills"]]
            matches = [s for s in data["required_skills"] if s["id"] in emp_skills]
            
            if matches:
                # Calculate match score (percentage of required skills met)
                score = (len(matches) / len(req_skill_ids)) * 100
                
                # Fit Analysis Logic
                fit_detail = f"Matches {len(matches)} out of {len(req_skill_ids)} required skills. "
                if score >= 80:
                    fit_detail += "Excellent candidate with strong technical alignment."
                elif score >= 50:
                    fit_detail += "Solid candidate with good core skill overlap."
                else:
                    fit_detail += "Potential candidate; some skill gaps identified for target role."

                possible_projects.append({
                    "project_id": pid,
                    "project_name": data["name"],
                    "status": data["status"],
                    "match_score": round(score, 1),
                    "matching_skills": [s["name"] for s in matches],
                    "all_required_skills": [s["name"] for s in data["required_skills"]],
                    "employee_project_history": project_history,
                    "fit_analysis": fit_detail
                })

        # Sort by match score descending
        possible_projects.sort(key=lambda x: x["match_score"], reverse=True)
        
        return possible_projects

    except Exception as e:
        print("Possible projects matching error:", e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
