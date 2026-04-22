from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict
from datetime import datetime, date
import calendar
from pydantic import BaseModel
from app.database import get_db_connection, release_db_connection, db_cursor
from app.routers.allocation_utils import (
    TeamMemberCreate, _save_single_resource, _resolve_employee_id,
    _fetch_existing_weekly_load, _available_capacity_pct, _normalize_text
)

router = APIRouter(prefix="/allocations", tags=["Allocations"])

class ImportAllocationsRequest(BaseModel):
    records: List[Dict]
    dry_run: bool = True
    import_mode: str = "monthly"  # "monthly" | "bulk"
    import_scope: str = "department" # "department" | "project"
    selected_month: Optional[str] = None # "YYYY-MM"
    scope_value: Optional[str] = None


@router.get("/metrics")
def allocation_metrics(
    department: Optional[str] = Query(None), 
    resource_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Returns all 6 info-card metrics for the Allocation page,
    filtered by department, resource type, and location.
    Optimized: single CTE query replaces 5-6 sequential queries and eliminates
    the N+1 correlated subquery in bench-strength calculation.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # --- Build shared filter fragments ---
        emp_filters = ["em.date_of_resign IS NULL", "(em.is_deleted IS FALSE OR em.is_deleted IS NULL)"]
        params = []

        if department and department != 'All Departments':
            dept_list = [d.strip() for d in department.split(',')]
            emp_filters.append("em.department = ANY(%s)")
            params.append(dept_list)
        if location and location != 'All Locations':
            emp_filters.append("em.location = %s")
            params.append(location)

        emp_where = " AND ".join(emp_filters)

        # Resource-type row-level pre-filter (injected as f-string, no extra params).
        # Bench Strength is handled purely via conditional aggregation in the outer SELECT.
        rt_filter = ""
        if resource_type == 'Billable Only':
            rt_filter = """
                AND EXISTS (
                    SELECT 1 FROM projects_allocation pa_rt
                    WHERE pa_rt.employee_id = em.employee_id
                      AND pa_rt.project_tags ILIKE '%%billab%%'
                      AND pa_rt.project_tags NOT ILIKE '%%non%%'
                      AND (pa_rt.allocation_end_date IS NULL OR pa_rt.allocation_end_date >= CURRENT_DATE)
                )"""
        elif resource_type == 'Internal Only':
            rt_filter = """
                AND EXISTS (
                    SELECT 1 FROM projects_allocation pa_rt
                    WHERE pa_rt.employee_id = em.employee_id
                      AND pa_rt.project_tags ILIKE '%%non%%billab%%'
                      AND (pa_rt.allocation_end_date IS NULL OR pa_rt.allocation_end_date >= CURRENT_DATE)
                )"""

        # -----------------------------------------------------------------------
        # Single CTE query – all 6 metrics in one round-trip
        #
        # ActiveAlloc : materialises every employee's active allocation stats ONCE
        #               (eliminates the N+1 correlated subquery for bench detection)
        # EmpBase     : filtered active employee roster
        # Final SELECT: derives all 6 metrics via conditional aggregation
        # -----------------------------------------------------------------------
        query = f"""
            WITH ActiveAlloc AS (
                SELECT
                    pa.employee_id,
                    SUM(pa.allocation_percentage) AS total_pct,
                    SUM(CASE
                        WHEN pa.project_tags ILIKE '%%billab%%'
                         AND pa.project_tags NOT ILIKE '%%non%%'
                        THEN pa.allocation_percentage ELSE 0
                    END) AS billable_pct,
                    SUM(CASE
                        WHEN pa.project_tags ILIKE '%%non%%billab%%'
                        THEN pa.allocation_percentage ELSE 0
                    END) AS non_billable_pct,
                    MAX(CASE
                        WHEN pa.project_tags ILIKE '%%billab%%'
                         AND pa.project_tags NOT ILIKE '%%non%%'
                        THEN 1 ELSE 0
                    END) AS has_billable,
                    MAX(CASE
                        WHEN pa.project_tags ILIKE '%%non%%billab%%'
                        THEN 1 ELSE 0
                    END) AS has_non_billable
                FROM projects_allocation pa
                JOIN projects pj ON pa.project_id = pj.project_id
                WHERE pa.allocation_start_date <= CURRENT_DATE
                  AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
                  AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                GROUP BY pa.employee_id
            ),
            EmpBase AS (
                SELECT em.employee_id
                FROM employee_master em
                WHERE {emp_where}
                {rt_filter}
            )
            SELECT
                COUNT(DISTINCT eb.employee_id)                                                          AS total_resources,
                COUNT(DISTINCT CASE WHEN COALESCE(aa.has_billable, 0) = 1
                                    THEN eb.employee_id END)                                            AS billable_count,
                COUNT(DISTINCT CASE WHEN COALESCE(aa.has_non_billable, 0) = 1
                                    THEN eb.employee_id END)                                            AS non_billable_count,
                COUNT(DISTINCT CASE WHEN COALESCE(aa.total_pct, 0) <= 0
                                    THEN eb.employee_id END)                                            AS bench_strength,
                ROUND(
                    COALESCE(SUM(COALESCE(aa.total_pct, 0)), 0)::NUMERIC /
                    NULLIF(COUNT(DISTINCT eb.employee_id), 0),
                2)                                                                                      AS avg_utilization,
                COUNT(DISTINCT CASE WHEN COALESCE(aa.billable_pct, 0) > 100
                                    THEN eb.employee_id END)                                            AS overallocated
            FROM EmpBase eb
            LEFT JOIN ActiveAlloc aa ON aa.employee_id = eb.employee_id
        """

        cur.execute(query, tuple(params))
        row = cur.fetchone()

        (
            total_resources,
            billable_count,
            non_billable_count,
            bench_strength,
            avg_utilization_raw,
            overallocated,
        ) = row

        # Apply resource_type suppression rules for semantically invalid metrics
        if resource_type == 'Bench Strength':
            billable_count     = 0
            non_billable_count = 0
            avg_utilization    = 0
            overallocated      = 0
        elif resource_type == 'Internal Only':
            overallocated   = 0
            avg_utilization = round(float(avg_utilization_raw or 0), 2)
        else:
            avg_utilization = round(float(avg_utilization_raw or 0), 2)

        return {
            "totalResources": {"value": total_resources,      "label": "Total Resources"},
            "billable":       {"value": billable_count,        "label": "Billable Count"},
            "nonBillable":    {"value": non_billable_count,    "label": "Non-Billable"},
            "benchStrength":  {"value": bench_strength,        "label": "Bench Strength"},
            "avgUtilization": {"value": f"{avg_utilization}%", "label": "Avg Utilization"},
            "overallocated":  {"value": overallocated,         "label": "Overallocated", "isAlert": overallocated > 0}
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
        where_clauses = ["(em.is_deleted IS FALSE OR em.is_deleted IS NULL)"]
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
              AND (em.is_deleted IS FALSE OR em.is_deleted IS NULL)
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
        where_clauses = ["(em.is_deleted IS FALSE OR em.is_deleted IS NULL)"]
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
            util_query += " AND " + " AND ".join(where_clauses)
        
        cur.execute(util_query, tuple(params))
        avg_util = float(cur.fetchone()[0])

        # 2. Breakdown by employee status
        breakdown_query = """
            SELECT p.employee_status, COUNT(*) 
            FROM employee_master_pro p
            JOIN employee_master em ON p.employee_id = em.employee_id
        """
        where_clauses_b = ["(em.is_deleted IS FALSE OR em.is_deleted IS NULL)"]
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
        where_clauses = ["em.date_of_resign IS NULL", "(em.is_deleted IS FALSE OR em.is_deleted IS NULL)"]
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
              AND (em.is_deleted IS FALSE OR em.is_deleted IS NULL)
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

@router.post("/import")
def import_allocations(payload: ImportAllocationsRequest = Body(...)):
    """
    Handles bulk/monthly allocation imports.
    Supports dry_run to validate data before committing.
    """
    records = payload.records
    dry_run = payload.dry_run
    import_mode = payload.import_mode
    import_scope = payload.import_scope
    selected_month = payload.selected_month
    scope_value = payload.scope_value

    # Monthly date range logic
    month_start = None
    month_end = None
    if import_mode == "monthly" and selected_month:
        try:
            y_str, m_str = selected_month.split('-')
            year, month = int(y_str), int(m_str)
            month_start = date(year, month, 1)
            last_day = calendar.monthrange(year, month)[1]
            month_end = date(year, month, last_day)
        except Exception:
            raise HTTPException(status_code=422, detail=f"Invalid selected_month format: {selected_month}")

    summary = {
        "total": len(records),
        "new": 0,
        "updated": 0,
        "over": 0,    # over-allocated (warning/error)
        "invalid": 0, # not found in DB
        "details": []
    }

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        if not dry_run:
            # Transaction starts
            # If project scope, we wipe existing project allocations first (as per agreed plan)
            if import_scope == "project" and scope_value:
                # Resolve project billability for tag derivation
                cur.execute("SELECT billable FROM projects WHERE project_id = %s", (scope_value,))
                proj_row = cur.fetchone()
                if not proj_row:
                    raise HTTPException(status_code=404, detail=f"Project {scope_value} not found")
                
                # Delete existing
                cur.execute("""
                    DELETE FROM weekly_allocations
                    WHERE allocation_id IN (
                        SELECT allocation_id FROM projects_allocation WHERE project_id = %s
                    )
                """, (scope_value,))
                cur.execute("DELETE FROM projects_allocation WHERE project_id = %s", (scope_value,))

        for idx, rec in enumerate(records):
            try:
                # Prepare TeamMemberCreate payload
                # Map frontend fields to model fields if different
                tm_data = {
                    "employee_id": str(rec.get("employee_id", "")),
                    "name": rec.get("employee_name", rec.get("name", "Unknown")),
                    "role": rec.get("role_in_project", rec.get("role", "Developer")),
                    "allocation_pct": rec.get("allocation_percentage"),
                    "allocation_start_date": rec.get("allocation_start_date") or (month_start.isoformat() if month_start else None),
                    "allocation_end_date": rec.get("allocation_end_date") or (month_end.isoformat() if month_end else None),
                    "location": rec.get("location", "Remote"),
                    "billable_shadow": rec.get("project_tags", "Billable").capitalize(),
                    "department": rec.get("department"),
                    "project_count": rec.get("project_count"),
                }
                tm = TeamMemberCreate(**tm_data)
                
                p_id = rec.get("project_id") or (scope_value if import_scope == "project" else None)
                if not p_id:
                    summary["invalid"] += 1
                    summary["details"].append({"row": idx+1, "status": "error", "message": "Project ID missing"})
                    continue

                # Resolve employee
                emp_id = _resolve_employee_id(cur, tm)
                if not emp_id:
                    summary["invalid"] += 1
                    summary["details"].append({"row": idx+1, "status": "error", "message": f"Employee {tm.name} ({tm.employee_id}) not found"})
                    continue

                # Check Project & Billability
                cur.execute("SELECT billable, start_date, end_date FROM projects WHERE project_id = %s", (p_id,))
                proj_row = cur.fetchone()
                if not proj_row:
                    summary["invalid"] += 1
                    summary["details"].append({"row": idx+1, "status": "error", "message": f"Project {p_id} not found"})
                    continue
                
                project_billable = proj_row[0] or "Billable"
                p_start, p_end = proj_row[1], proj_row[2]

                # Capacity Check (Dry Run)
                a_start = month_start or p_start or date.today()
                a_end = month_end or p_end
                
                load = _fetch_existing_weekly_load(cur, emp_id, a_start, a_end)
                available = _available_capacity_pct(load)
                
                status_msg = "new"
                # Check if already exists in this project
                cur.execute("SELECT allocation_id FROM projects_allocation WHERE employee_id = %s AND project_id = %s", (emp_id, p_id))
                exist_alloc = cur.fetchone()
                if exist_alloc:
                    status_msg = "updated"

                if not dry_run:
                    _save_single_resource(
                        cur, p_id, tm, project_billable,
                        replace_allocation_id=exist_alloc[0] if exist_alloc else None,
                        project_start=p_start, project_end=p_end,
                        validate_capacity=True # Still validate!
                    )
                
                summary[status_msg] += 1
                if available < tm.allocation_pct:
                    summary["over"] += 1
                    summary["details"].append({"row": idx+1, "status": "warning", "message": f"Over-allocation: {emp_id} has only {available}% capacity."})
                else:
                    summary["details"].append({"row": idx+1, "status": "success", "message": f"{status_msg.capitalize()} allocation for {emp_id}"})

            except Exception as e:
                summary["invalid"] += 1
                summary["details"].append({"row": idx+1, "status": "error", "message": str(e)})

        if not dry_run:
            conn.commit()
            
        return summary

    except Exception as e:
        if not dry_run:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
