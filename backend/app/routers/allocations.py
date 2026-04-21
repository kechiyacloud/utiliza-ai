from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.database import get_db_connection, release_db_connection

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.get("/metrics")
def allocation_metrics(
    department: Optional[str] = Query(None), 
    resource_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Returns all 6 info-card metrics for the Allocation page,
    filtered by department, resource type, and location.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Build base WHERE clauses for employee filtering
        where_clauses = []
        params = []
        
        if department and department != 'All Departments':
            dept_list = [d.strip() for d in department.split(',')]
            where_clauses.append("em.department = ANY(%s)")
            params.append(dept_list)
        if location and location != 'All Locations':
            where_clauses.append("em.location = %s")
            params.append(location)

        # 1. Total Resources (Active employees only)
        tr_query = "SELECT COUNT(*) FROM employee_master em WHERE em.date_of_resign IS NULL"
        tr_where = list(where_clauses)
        tr_params = list(params)
        
        if resource_type == 'Billable Only':
            tr_where.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND pa.project_tags ILIKE %s AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE))")
            tr_params.append('%billab%')
        elif resource_type == 'Internal Only':
            tr_where.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND pa.project_tags ILIKE %s AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE))")
            tr_params.append('%non%billab%')
        elif resource_type == 'Bench Strength':
            tr_where.append("COALESCE((SELECT SUM(pa3.allocation_percentage) FROM projects_allocation pa3 JOIN projects pj3 ON pa3.project_id = pj3.project_id WHERE pa3.employee_id = em.employee_id AND pa3.allocation_start_date <= CURRENT_DATE AND (pa3.allocation_end_date IS NULL OR pa3.allocation_end_date >= CURRENT_DATE) AND LOWER(pj3.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')), 0) <= 0")
            
        if tr_where:
            tr_query += " AND " + " AND ".join(tr_where)
        cur.execute(tr_query, tuple(tr_params))
        total_resources = cur.fetchone()[0]

        # 2. Billable Count (Headcount with Billable tag)
        billable_query = """
            SELECT COUNT(DISTINCT pa.employee_id)
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.project_tags ILIKE %s AND pa.project_tags NOT ILIKE %s
              AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
              AND em.date_of_resign IS NULL
        """
        b_where = list(where_clauses)
        b_params = ['%billab%', '%non%'] + list(params)
        
        if resource_type == 'Bench Strength':
             b_where.append("1=0")
        if b_where:
            billable_query += " AND " + " AND ".join(b_where)
        cur.execute(billable_query, tuple(b_params))
        billable_count = cur.fetchone()[0]

        # 3. Non-Billable Count (Headcount with Non-Billable tag)
        non_billable_query = """
            SELECT COUNT(DISTINCT pa.employee_id)
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.project_tags ILIKE %s
              AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
              AND em.date_of_resign IS NULL
        """
        nb_where = list(where_clauses)
        nb_params = ['%non%billab%'] + list(params)
        
        if resource_type == 'Bench Strength':
             nb_where.append("1=0")
        if nb_where:
            non_billable_query += " AND " + " AND ".join(nb_where)
        cur.execute(non_billable_query, tuple(nb_params))
        non_billable_count = cur.fetchone()[0]

        # 4. Bench Strength
        bench_query = """
            SELECT COUNT(*) FROM employee_master em
            LEFT JOIN employee_master_pro p ON em.employee_id = p.employee_id
            WHERE em.date_of_resign IS NULL
              AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 JOIN projects pj2 ON pa2.project_id = pj2.project_id WHERE pa2.employee_id = em.employee_id AND pa2.allocation_start_date <= CURRENT_DATE AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE) AND LOWER(pj2.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')), 0) <= 0
        """
        ben_where = list(where_clauses)
        if resource_type == 'Billable Only' or resource_type == 'Internal Only':
             ben_where.append("1=0")
        if ben_where:
            bench_query += " AND " + " AND ".join(ben_where)
        cur.execute(bench_query, tuple(params))
        bench_strength = cur.fetchone()[0]

        # 5. Avg Utilization
        if resource_type == 'Bench Strength':
             avg_utilization = 0
        else:
            # Use a robust LEFT JOIN to accurately calculate average utilization 
            # across the filtered employee set, ensuring numerator and denominator stay in sync.
            util_where_clause = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            util_query = f"""
                SELECT 
                    COALESCE(SUM(pa.allocation_percentage), 0)::FLOAT / 
                    NULLIF(COUNT(DISTINCT em.employee_id), 0)
                FROM employee_master em
                LEFT JOIN projects_allocation pa ON em.employee_id = pa.employee_id 
                    AND pa.allocation_start_date <= CURRENT_DATE
                    AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
                LEFT JOIN projects pj ON pa.project_id = pj.project_id
                {util_where_clause}
                {" AND " if util_where_clause else " WHERE "} (pj.project_id IS NULL OR LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold'))
            """
            cur.execute(util_query, tuple(params))
            avg_utilization_val = cur.fetchone()[0]
            avg_utilization = round(float(avg_utilization_val or 0), 2)

        # 6. Overallocated
        if resource_type == 'Bench Strength' or resource_type == 'Internal Only':
             overallocated = 0
        else:
            overalloc_query = """
                SELECT COUNT(*) FROM (
                    SELECT pa.employee_id
                    FROM projects_allocation pa
                    JOIN projects pj ON pa.project_id = pj.project_id
                    JOIN employee_master em ON pa.employee_id = em.employee_id
                    WHERE pa.project_tags ILIKE %s AND pa.project_tags NOT ILIKE %s

                      AND pa.allocation_start_date <= CURRENT_DATE
                      AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
                      AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                    {0}
                    GROUP BY pa.employee_id
                    HAVING SUM(pa.allocation_percentage) > 100
                ) overalloc
            """.format(" AND " + " AND ".join(where_clauses) if where_clauses else "")
            over_params = list(params)
            over_params.insert(0, '%billable%')
            over_params.insert(1, '%non%billab%')
            cur.execute(overalloc_query, tuple(over_params))

            row = cur.fetchone()
            overallocated = row[0] if row else 0

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
def allocation_projects(
    department: Optional[str] = Query(None), 
    resource_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Returns all projects with their billable and non-billable employee counts,
    optionally filtered by department, resource type, and location.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        query = """
            SELECT
                pa.project_id,
                p.project_name,
                COUNT(DISTINCT CASE WHEN (pa.project_tags ILIKE %s AND pa.project_tags NOT ILIKE %s) AND pa.allocation_start_date <= CURRENT_DATE AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE) AND LOWER(p.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold') THEN pa.employee_id END) AS billable_count,
                COUNT(DISTINCT CASE WHEN pa.project_tags ILIKE %s AND pa.allocation_start_date <= CURRENT_DATE AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE) AND LOWER(p.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold') THEN pa.employee_id END) AS non_billable_count
            FROM projects_allocation pa
            JOIN projects p ON pa.project_id = p.project_id
            JOIN employee_master em ON pa.employee_id = em.employee_id
            JOIN employee_master_pro ppro ON em.employee_id = ppro.employee_id
        """
        where_clauses = []
        params = []
        
        if department and department != 'All Departments':
            dept_list = [d.strip() for d in department.split(',')]
            where_clauses.append("em.department = ANY(%s)")
            params.append(dept_list)
        if location and location != 'All Locations':
            where_clauses.append("em.location = %s")
            params.append(location)
            
        if resource_type == 'Billable Only':
            where_clauses.append("(pa.project_tags ILIKE '%%billable%%' AND pa.project_tags NOT ILIKE '%%non%%billable%%')")
        elif resource_type == 'Internal Only':
            where_clauses.append("pa.project_tags ILIKE '%%non%%billable%%'")
        elif resource_type == 'Bench Strength':
            where_clauses.append("COALESCE((SELECT SUM(pa4.allocation_percentage) FROM projects_allocation pa4 JOIN projects pj4 ON pa4.project_id = pj4.project_id WHERE pa4.employee_id = em.employee_id AND pa4.allocation_start_date <= CURRENT_DATE AND (pa4.allocation_end_date IS NULL OR pa4.allocation_end_date >= CURRENT_DATE) AND LOWER(pj4.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')), 0) <= 0")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        query += " GROUP BY pa.project_id, p.project_name"
        query += " ORDER BY p.project_name"
        
        proj_params = ['%billable%', '%non%billab%', '%non%billab%'] + list(params)
        cur.execute(query, tuple(proj_params))

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
            JOIN projects pj ON pa.project_id = pj.project_id
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.project_id = %s
              AND pa.allocation_start_date <= CURRENT_DATE
              AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
              AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
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
def organization_utilization(
    department: Optional[str] = Query(None), 
    resource_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Returns organization-wide utilization and breakdown, 
    optionally filtered by department, resource type, and location.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Avg Utilization
        util_query = """
            SELECT COALESCE(AVG(pa.allocation_percentage), 0) 
            FROM projects_allocation pa
            JOIN projects pj ON pa.project_id = pj.project_id
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.allocation_start_date <= CURRENT_DATE
              AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
              AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
        """
        where_clauses = []
        params = []
        if department and department != 'All Departments':
            dept_list = [d.strip() for d in department.split(',')]
            where_clauses.append("em.department = ANY(%s)")
            params.append(dept_list)
        if location and location != 'All Locations':
            where_clauses.append("em.location = %s")
            params.append(location)
        
        if resource_type == 'Billable Only':
            where_clauses.append("LOWER(pa.project_tags) = 'billable'")
        elif resource_type == 'Internal Only':
            where_clauses.append("LOWER(pa.project_tags) = 'non-billable'")
        elif resource_type == 'Bench Strength':
             # Utilization is 0 for bench by definition, but let's check if the query returns 0
             where_clauses.append("ppro.employee_status = 'Bench'")
        
        if where_clauses:
            util_query += " WHERE " + " AND ".join(where_clauses)
        
        cur.execute(util_query, tuple(params))
        avg_util = float(cur.fetchone()[0])

        # 2. Breakdown by employee status
        breakdown_query = """
            SELECT p.employee_status, COUNT(*) 
            FROM employee_master_pro p
            JOIN employee_master em ON p.employee_id = em.employee_id
        """
        where_clauses_b = []
        params_b = []
        if department and department != 'All Departments':
            dept_list = [d.strip() for d in department.split(',')]
            where_clauses_b.append("em.department = ANY(%s)")
            params_b.append(dept_list)
        if location and location != 'All Locations':
            where_clauses_b.append("em.location = %s")
            params_b.append(location)
            
        if resource_type == 'Billable Only':
            where_clauses_b.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND LOWER(pa.project_tags) = 'billable')")
        elif resource_type == 'Internal Only':
            where_clauses_b.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND LOWER(pa.project_tags) = 'non-billable')")
        elif resource_type == 'Bench Strength':
            where_clauses_b.append("p.employee_status = 'Bench'")

        if where_clauses_b:
            breakdown_query += " WHERE " + " AND ".join(where_clauses_b)
        
        breakdown_query += " GROUP BY p.employee_status"
        cur.execute(breakdown_query, tuple(params_b))
        
        rows = cur.fetchall()
        
        color_map = {
            "Bench": "#94a3b8",
            "Billable": "#60a5fa",
            "Internal": "#c084fc",
            "Training": "#34d399"
        }
        
        breakdown = []
        for status, count in rows:
            if status:
                breakdown.append({
                    "label": status,
                    "value": count,
                    "color": color_map.get(status, "#cbd5e1")
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
def department_allocation_breakdown(
    location: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None)
):
    """
    Returns billable and non-billable employee counts per department.
    Filtered by location and resource type.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        where_clauses = ["em.date_of_resign IS NULL"]
        params = []
        
        if location and location != 'All Locations':
            where_clauses.append("em.location = %s")
            params.append(location)
            
        if resource_type == 'Billable Only':
            where_clauses.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND LOWER(pa.project_tags) = 'billable')")
        elif resource_type == 'Internal Only':
            where_clauses.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND LOWER(pa.project_tags) = 'non-billable')")
        elif resource_type == 'Bench Strength':
            where_clauses.append("ppro.employee_status = 'Bench'")

        query = """
            WITH EmpStatus AS (
                SELECT
                    em.employee_id,
                    em.department,
                    CASE
                        WHEN (EXISTS (SELECT 1 FROM projects_allocation pa JOIN projects pj ON pa.project_id = pj.project_id WHERE pa.employee_id = em.employee_id AND pa.allocation_percentage > 0 AND pa.project_tags ILIKE %s AND pa.project_tags NOT ILIKE %s AND pa.allocation_start_date <= CURRENT_DATE AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE) AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold'))) THEN 1
                        WHEN (EXISTS (SELECT 1 FROM projects_allocation pa JOIN projects pj ON pa.project_id = pj.project_id WHERE pa.employee_id = em.employee_id AND pa.allocation_percentage > 0 AND pa.project_tags ILIKE %s AND pa.allocation_start_date <= CURRENT_DATE AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE) AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold'))) THEN 2
                        WHEN (EXISTS (SELECT 1 FROM projects_allocation pa JOIN projects pj ON pa.project_id = pj.project_id WHERE pa.employee_id = em.employee_id AND pa.allocation_percentage = 0 AND pa.project_tags ILIKE %s AND pa.project_tags NOT ILIKE %s AND pa.allocation_start_date <= CURRENT_DATE AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE) AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold'))) THEN 3
                        ELSE 4
                    END as status_rank
                FROM employee_master em
                JOIN employee_master_pro ppro ON em.employee_id = ppro.employee_id
                WHERE {0}
            )
            SELECT
                department,
                COUNT(CASE WHEN status_rank = 1 THEN 1 END) as allocated_billable,
                COUNT(CASE WHEN status_rank = 2 THEN 1 END) as allocated_non_billable,
                COUNT(CASE WHEN status_rank = 3 THEN 1 END) as not_allocated_billable
            FROM EmpStatus
            GROUP BY department
            ORDER BY department
        """.format(" AND ".join(where_clauses) if where_clauses else "TRUE")

        chart_params = ['%billab%', '%non%', '%non%billab%', '%billab%', '%non%'] + list(params)
        cur.execute(query, tuple(chart_params))
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
def get_forecast_bench(
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Returns employees whose allocation is ending within the next 30 days.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        query = """
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
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        """
        params = []
        if department and department != 'All Departments':
            dept_list = [d.strip() for d in department.split(',')]
            query += " AND em.department = ANY(%s)"
            params.append(dept_list)
        if location and location != 'All Locations':
            query += " AND em.location = %s"
            params.append(location)

        query += " ORDER BY pa.allocation_end_date ASC"

        cur.execute(query, tuple(params))
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
