from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import calendar
from datetime import date
from app.database import get_db_connection, release_db_connection


# ── Import Allocation Pydantic models ────────────────────────────────────────

class AllocationImportRecord(BaseModel):
    employee_id: str
    project_id: Optional[str] = None
    allocation_percentage: int
    role_in_project: Optional[str] = None
    project_tags: Optional[str] = "billable"
    allocation_start_date: Optional[str] = None
    allocation_end_date: Optional[str] = None

class AllocationImportRequest(BaseModel):
    records: List[AllocationImportRecord]
    dry_run: bool = True
    import_mode: str            # "monthly" | "bulk"
    import_scope: str           # "department" | "project"
    selected_month: Optional[str] = None   # "YYYY-MM"
    scope_value: Optional[str] = None      # dept name or project_id

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
            where_clauses.append("em.department = %s")
            params.append(department)
        if location and location != 'All Locations':
            where_clauses.append("em.location = %s")
            params.append(location)

        # 1. Total Resources
        tr_query = "SELECT COUNT(*) FROM employee_master em LEFT JOIN employee_master_pro p ON em.employee_id = p.employee_id"
        tr_where = list(where_clauses)
        if resource_type == 'Billable Only':
            tr_where.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND LOWER(pa.project_tags) = 'billable')")
        elif resource_type == 'Internal Only':
            tr_where.append("EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND LOWER(pa.project_tags) = 'non-billable')")
        elif resource_type == 'Bench Strength':
            tr_where.append("p.employee_status = 'Bench'")
            
        if tr_where:
            tr_query += " WHERE " + " AND ".join(tr_where)
        cur.execute(tr_query, tuple(params))
        total_resources = cur.fetchone()[0]

        # 2. Billable Count
        billable_query = """
            SELECT COUNT(DISTINCT pa.employee_id)
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE LOWER(pa.project_tags) = 'billable'
        """
        b_where = list(where_clauses)
        if resource_type == 'Bench Strength':
             b_where.append("1=0")
        if b_where:
            billable_query += " AND " + " AND ".join(b_where)
        cur.execute(billable_query, tuple(params))
        billable_count = cur.fetchone()[0]

        # 3. Non-Billable Count
        non_billable_query = """
            SELECT COUNT(DISTINCT pa.employee_id)
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE LOWER(pa.project_tags) = 'non-billable'
        """
        nb_where = list(where_clauses)
        if resource_type == 'Bench Strength':
             nb_where.append("1=0")
        if nb_where:
            non_billable_query += " AND " + " AND ".join(nb_where)
        cur.execute(non_billable_query, tuple(params))
        non_billable_count = cur.fetchone()[0]

        # 4. Bench Strength
        bench_query = "SELECT COUNT(*) FROM employee_master_pro p JOIN employee_master em ON p.employee_id = em.employee_id WHERE p.employee_status = 'Bench'"
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
            util_query = """
                SELECT COALESCE(SUM(pa.allocation_percentage), 0) / NULLIF((SELECT COUNT(*) FROM employee_master em {0}), 0)
                FROM projects_allocation pa
                JOIN employee_master em ON pa.employee_id = em.employee_id
            """.format(" WHERE " + " AND ".join(where_clauses) if where_clauses else "")
            
            # Need params twice for SUM and for NULLIF subquery
            cur.execute(util_query, tuple(params + params))
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
                    JOIN employee_master em ON pa.employee_id = em.employee_id
                    WHERE LOWER(pa.project_tags) = 'billable'
                    {0}
                    GROUP BY pa.employee_id
                    HAVING COUNT(DISTINCT pa.project_id) > 1
                ) overalloc
            """.format(" AND " + " AND ".join(where_clauses) if where_clauses else "")
            cur.execute(overalloc_query, tuple(params))
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
                COUNT(DISTINCT CASE WHEN LOWER(pa.project_tags) = 'billable' THEN pa.employee_id END) AS billable_count,
                COUNT(DISTINCT CASE WHEN LOWER(pa.project_tags) = 'non-billable' THEN pa.employee_id END) AS non_billable_count
            FROM projects_allocation pa
            JOIN projects p ON pa.project_id = p.project_id
            JOIN employee_master em ON pa.employee_id = em.employee_id
            JOIN employee_master_pro ppro ON em.employee_id = ppro.employee_id
        """
        where_clauses = []
        params = []
        
        if department and department != 'All Departments':
            where_clauses.append("em.department = %s")
            params.append(department)
        if location and location != 'All Locations':
            where_clauses.append("em.location = %s")
            params.append(location)
            
        if resource_type == 'Billable Only':
            where_clauses.append("LOWER(pa.project_tags) = 'billable'")
        elif resource_type == 'Internal Only':
            where_clauses.append("LOWER(pa.project_tags) = 'non-billable'")
        elif resource_type == 'Bench Strength':
            where_clauses.append("ppro.employee_status = 'Bench'")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        query += " GROUP BY pa.project_id, p.project_name"
        query += " ORDER BY p.project_name"
        
        cur.execute(query, tuple(params))
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
            JOIN employee_master em ON pa.employee_id = em.employee_id
            JOIN employee_master_pro ppro ON em.employee_id = ppro.employee_id
        """
        where_clauses = []
        params = []
        if department and department != 'All Departments':
            where_clauses.append("em.department = %s")
            params.append(department)
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
            where_clauses_b.append("em.department = %s")
            params_b.append(department)
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
                        WHEN (EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND pa.allocation_percentage > 0 AND LOWER(pa.project_tags) LIKE '%%billable%%' AND LOWER(pa.project_tags) NOT LIKE '%%non%%')) THEN 1
                        WHEN (EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND pa.allocation_percentage > 0 AND LOWER(pa.project_tags) LIKE '%%nonbillable%%')) THEN 2
                        WHEN (EXISTS (SELECT 1 FROM projects_allocation pa WHERE pa.employee_id = em.employee_id AND pa.allocation_percentage = 0 AND LOWER(pa.project_tags) LIKE '%%billable%%' AND LOWER(pa.project_tags) NOT LIKE '%%non%%')) THEN 3
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
        """.format(" AND ".join(where_clauses))

        cur.execute(query, tuple(params))
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
            query += " AND em.department = %s"
            params.append(department)
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


@router.post("/import")
def import_allocations(body: AllocationImportRequest):
    """
    Dry-run or commit import of bulk allocation records.
    dry_run=True  → validate + classify, no DB writes.
    dry_run=False → upsert all valid records in a transaction.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        records = body.records
        dry_run = body.dry_run
        import_mode = body.import_mode
        import_scope = body.import_scope
        selected_month = body.selected_month
        scope_value = body.scope_value

        # ── 1. Monthly date range ────────────────────────────────────────────
        month_start = None
        month_end = None
        if import_mode == "monthly" and selected_month:
            year, month = int(selected_month[:4]), int(selected_month[5:7])
            month_start = date(year, month, 1)
            last_day = calendar.monthrange(year, month)[1]
            month_end = date(year, month, last_day)

        # ── 2. Inject project_id for project-wise scope ──────────────────────
        if import_scope == "project" and scope_value:
            for rec in records:
                if not rec.project_id:
                    rec.project_id = scope_value

        # ── 3. Build lookup caches (4 batch queries — no N+1) ────────────────
        employee_ids = list({r.employee_id for r in records if r.employee_id})
        project_ids  = list({r.project_id  for r in records if r.project_id})

        emp_map: Dict[str, str] = {}
        if employee_ids:
            cur.execute(
                "SELECT employee_id, employee_name FROM employee_master WHERE employee_id = ANY(%s)",
                (employee_ids,)
            )
            emp_map = {row[0]: row[1] for row in cur.fetchall()}

        proj_map: Dict[str, str] = {}
        if project_ids:
            cur.execute(
                "SELECT project_id, project_name FROM projects WHERE project_id = ANY(%s)",
                (project_ids,)
            )
            proj_map = {row[0]: row[1] for row in cur.fetchall()}

        # existing allocation keyed by (employee_id, project_id)
        existing_map: Dict[tuple, Dict] = {}
        if employee_ids and project_ids:
            cur.execute(
                """
                SELECT employee_id, project_id, allocation_id, allocation_percentage
                FROM projects_allocation
                WHERE employee_id = ANY(%s) AND project_id = ANY(%s)
                """,
                (employee_ids, project_ids)
            )
            for row in cur.fetchall():
                existing_map[(row[0], row[1])] = {"allocation_id": row[2], "old_pct": row[3]}

        # current total allocation per employee (sum of all active allocations)
        emp_current_total: Dict[str, int] = {}
        if employee_ids:
            cur.execute(
                """
                SELECT employee_id, COALESCE(SUM(allocation_percentage), 0)
                FROM projects_allocation
                WHERE employee_id = ANY(%s)
                  AND (allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE)
                GROUP BY employee_id
                """,
                (employee_ids,)
            )
            emp_current_total = {row[0]: int(row[1]) for row in cur.fetchall()}

        # ── 4. Classify records ──────────────────────────────────────────────
        new_records:     List[Dict[str, Any]] = []
        updated_records: List[Dict[str, Any]] = []
        invalid_records: List[Dict[str, Any]] = []
        over_alloc_map:  Dict[str, Dict] = {}

        for rec in records:
            row_data = rec.dict()

            if not rec.employee_id or rec.employee_id not in emp_map:
                invalid_records.append({"row_data": row_data, "error": f"Employee '{rec.employee_id}' not found"})
                continue

            if not rec.project_id or rec.project_id not in proj_map:
                invalid_records.append({"row_data": row_data, "error": f"Project '{rec.project_id}' not found"})
                continue

            pct = rec.allocation_percentage
            if not (0 <= pct <= 100):
                invalid_records.append({"row_data": row_data, "error": f"allocation_percentage {pct} out of range (0-100)"})
                continue

            # Resolve dates
            if import_mode == "monthly":
                start_date_val = month_start
                end_date_val   = month_end
            else:
                try:
                    start_date_val = date.fromisoformat(rec.allocation_start_date) if rec.allocation_start_date else None
                    end_date_val   = date.fromisoformat(rec.allocation_end_date)   if rec.allocation_end_date   else None
                except ValueError:
                    invalid_records.append({"row_data": row_data, "error": "Invalid date format — use YYYY-MM-DD"})
                    continue

            emp_name  = emp_map[rec.employee_id]
            proj_name = proj_map[rec.project_id]
            key = (rec.employee_id, rec.project_id)

            enriched = {
                "employee_id":           rec.employee_id,
                "employee_name":         emp_name,
                "project_id":            rec.project_id,
                "project_name":          proj_name,
                "allocation_percentage": pct,
                "role_in_project":       rec.role_in_project,
                "project_tags":          rec.project_tags or "billable",
                "allocation_start_date": str(start_date_val) if start_date_val else None,
                "allocation_end_date":   str(end_date_val)   if end_date_val   else None,
            }

            if key in existing_map:
                old_pct = existing_map[key]["old_pct"]
                enriched["old_allocation_percentage"] = old_pct
                enriched["allocation_id"] = existing_map[key]["allocation_id"]
                updated_records.append(enriched)
                delta = pct - old_pct
            else:
                new_records.append(enriched)
                delta = pct

            # Accumulate over-allocation per employee
            current_total = emp_current_total.get(rec.employee_id, 0)
            if rec.employee_id not in over_alloc_map:
                over_alloc_map[rec.employee_id] = {
                    "employee_id":   rec.employee_id,
                    "employee_name": emp_name,
                    "current_total": current_total,
                    "additional":    0,
                    "combined":      current_total,
                }
            over_alloc_map[rec.employee_id]["additional"] += delta
            over_alloc_map[rec.employee_id]["combined"] = (
                over_alloc_map[rec.employee_id]["current_total"] +
                over_alloc_map[rec.employee_id]["additional"]
            )

        over_allocated = [v for v in over_alloc_map.values() if v["combined"] > 100]
        can_save = len(invalid_records) == 0

        # ── 5. Dry-run — return without touching DB ──────────────────────────
        if dry_run:
            return {
                "new_records":     new_records,
                "updated_records": updated_records,
                "over_allocated":  over_allocated,
                "invalid_records": invalid_records,
                "can_save":        can_save,
            }

        # ── 6. Commit — upsert each valid record ─────────────────────────────
        if not can_save:
            raise HTTPException(status_code=400, detail="Cannot save: fix invalid records first.")

        valid_records = new_records + updated_records

        for rec_dict in valid_records:
            emp_id  = rec_dict["employee_id"]
            proj_id = rec_dict["project_id"]

            if (emp_id, proj_id) not in existing_map:
                cur.execute("SELECT 'PA-' || LPAD(nextval('alloc_id_seq')::TEXT, 5, '0')")
                alloc_id = cur.fetchone()[0]
            else:
                alloc_id = existing_map[(emp_id, proj_id)]["allocation_id"]

            cur.execute(
                """
                INSERT INTO projects_allocation (
                    allocation_id, employee_id, project_id, role_in_project,
                    allocation_percentage, allocation_start_date, allocation_end_date,
                    project_tags, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (employee_id, project_id) DO UPDATE SET
                    role_in_project       = EXCLUDED.role_in_project,
                    allocation_percentage = EXCLUDED.allocation_percentage,
                    allocation_start_date = EXCLUDED.allocation_start_date,
                    allocation_end_date   = EXCLUDED.allocation_end_date,
                    project_tags          = EXCLUDED.project_tags,
                    updated_at            = NOW()
                """,
                (
                    alloc_id,
                    emp_id,
                    proj_id,
                    rec_dict.get("role_in_project"),
                    rec_dict["allocation_percentage"],
                    rec_dict.get("allocation_start_date"),
                    rec_dict.get("allocation_end_date"),
                    rec_dict.get("project_tags", "billable"),
                )
            )

        conn.commit()
        return {
            "new_records":     new_records,
            "updated_records": updated_records,
            "over_allocated":  over_allocated,
            "invalid_records": [],
            "can_save":        True,
            "saved":           True,
            "upserted_count":  len(valid_records),
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
