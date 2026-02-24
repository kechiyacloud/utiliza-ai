from fastapi import APIRouter, HTTPException
from app.database import get_db_connection

router = APIRouter()

@router.get("/dashboard/infocards")
def dashboard_infocards():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # ---- Total Employees ----
        cur.execute("SELECT COUNT(*) FROM employee_master")
        total_employees = cur.fetchone()[0]

        # ---- Total Clients ----
        total_clients = 0

        # ---- Running Projects (case safe) ----
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(project_status) IN ('running', 'in progress', 'live', 'active')
        """)
        running_projects = cur.fetchone()[0]

        # ---- Bench Employees 
        cur.execute("""
            SELECT COUNT(*)
            FROM employee_master_pro p
            WHERE p.employee_status = 'Bench'
        """)
        bench_employees = cur.fetchone()[0]

        return {
            "total_employees": total_employees,
            "total_clients": total_clients,
            "running_projects": running_projects,
            "bench_employees": bench_employees
        }

    except Exception as e:
        print(" REAL DB ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail=str(e)   # show real error temporarily
        )

    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/allocation-3m")
def allocation_3m():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', CURRENT_DATE),
                    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months',
                    INTERVAL '1 month'
                ) AS month_start
            )
            SELECT
                TO_CHAR(m.month_start, 'YYYY-MM') AS month,
                COUNT(DISTINCT pa.employee_id) AS allocations
            FROM months m
            LEFT JOIN projects_allocation pa
              ON pa.allocation_start_date <= (m.month_start + INTERVAL '1 month' - INTERVAL '1 day')
             AND pa.allocation_end_date >= m.month_start
            GROUP BY m.month_start
            ORDER BY m.month_start
        """)

        rows = cur.fetchall()

        return [
            {"month": r[0], "allocations": r[1]}
            for r in rows
        ]

    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/high-allocation-projects")
def high_allocation_projects():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT p.project_name,
                   COUNT(pa.employee_id) AS resource_count
            FROM projects p
            JOIN projects_allocation pa
              ON p.project_id = pa.project_id
            GROUP BY p.project_name
            ORDER BY resource_count DESC
            LIMIT 5
        """)

        rows = cur.fetchall()

        return [
            {"project_name": r[0], "resource_count": r[1]}
            for r in rows
        ]

    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/top-performers")
def top_performers():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT e.employee_id,
                   e.employee_name,
                   COUNT(pa.project_id) AS project_count
            FROM employee_master e
            JOIN projects_allocation pa
              ON e.employee_id = pa.employee_id
            GROUP BY e.employee_id, e.employee_name
            ORDER BY project_count DESC
            LIMIT 5
        """)

        rows = cur.fetchall()

        return [
            {
                "employee_id": r[0],
                "employee_name": r[1],
                "project_count": r[2]
            }
            for r in rows
        ]

    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/upcoming-availability")
def upcoming_availability():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                e.employee_name,
                p.project_name,
                pa.allocation_end_date,
                pa.allocation_percentage
            FROM projects_allocation pa
            JOIN employee_master e
              ON e.employee_id = pa.employee_id
            JOIN projects p
              ON p.project_id = pa.project_id
            WHERE pa.allocation_end_date BETWEEN
                  CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
            ORDER BY pa.allocation_end_date
        """)

        rows = cur.fetchall()

        return [
            {
                "employee": r[0],
                "project": r[1],
                "release_date": r[2],
                "allocation_percent": r[3]
            }
            for r in rows
        ]

    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/client-health")
def client_health():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # No clients table available, return empty
        return []

    finally:
        cur.close()
        conn.close()


@router.get("/dashboard/skills-gap")
def skills_gap():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                s.skill_name,
                COUNT(DISTINCT es.employee_id),
                COUNT(DISTINCT ps.project_id)
            FROM skills s
            LEFT JOIN employee_skills es
              ON s.skill_id = es.skill_id
            LEFT JOIN project_skills ps
              ON s.skill_id = ps.skill_id
            GROUP BY s.skill_name
        """)

        rows = cur.fetchall()
        result = []

        for r in rows:
            certified = r[1] or 0
            demand = r[2] or 0

            if demand > certified:
                gap = "high"
            elif demand == certified:
                gap = "medium"
            else:
                gap = "low"

            result.append({
                "skill": r[0],
                "certified": certified,
                "demand": demand,
                "gap": gap
            })

        return result

    finally:
        cur.close()
        conn.close()
