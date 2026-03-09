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

        # ---- Total Clients (Count of billable projects for now) ----
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(billable) LIKE '%billable%' AND LOWER(billable) NOT LIKE '%non%' OR LOWER(billable) = 'yes'
        """)
        total_clients = cur.fetchone()[0]

        # ---- Running Projects (case safe) ----
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(project_status) IN ('running', 'in progress', 'live', 'active')
        """)
        running_projects = cur.fetchone()[0]

        # ---- Bench Employees 
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id) 
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE (p.employee_status NOT ILIKE '%notice%' OR p.employee_status IS NULL)
            AND m.date_of_resign IS NULL
            AND COALESCE(p.employee_allocations, 0) <= 0
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
                    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 months',
                    INTERVAL '1 month'
                ) AS month_start
            )
            SELECT
                TO_CHAR(m.month_start, 'YYYY-MM') AS month,
                COUNT(DISTINCT pa.employee_id) AS allocations
            FROM months m
            LEFT JOIN projects_allocation pa
              ON pa.allocation_start_date <= (m.month_start + INTERVAL '1 month' - INTERVAL '1 day')
             AND (pa.allocation_end_date >= m.month_start OR pa.allocation_end_date IS NULL)
            LEFT JOIN employee_master e ON pa.employee_id = e.employee_id
            WHERE e.date_of_resign IS NULL OR pa.employee_id IS NULL
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
            JOIN employee_master e ON pa.employee_id = e.employee_id
            WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
            AND e.date_of_resign IS NULL
            AND LOWER(p.project_status) NOT LIKE '%end%'
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
                   e.role_designation AS role,
                   COALESCE(p.employee_allocations, 0) AS allocation
            FROM employee_master e
            LEFT JOIN employee_master_pro p
              ON e.employee_id = p.employee_id
            WHERE e.date_of_resign IS NULL 
            AND COALESCE(p.employee_allocations, 0) > 0
            ORDER BY p.employee_allocations DESC NULLS LAST
            LIMIT 5
        """)

        rows = cur.fetchall()

        return [
            {
                "employee_id": r[0],
                "employee_name": r[1],
                "role": r[2],
                "allocation": r[3]
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


@router.get("/dashboard/executive-metrics")
def dashboard_executive_metrics():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM employee_master m")
        total_employees = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NOT NULL")
        notice_period = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(DISTINCT pa.employee_id) 
            FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id = m.employee_id
            WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
            AND LOWER(pa.project_tags) = 'billable'
            AND m.date_of_resign IS NULL
        """)
        billable_headcount = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id) 
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE (p.employee_status NOT ILIKE '%notice%' OR p.employee_status IS NULL)
            AND m.date_of_resign IS NULL
            AND COALESCE(p.employee_allocations, 0) <= 0
        """)
        bench_headcount = cur.fetchone()[0]

        internal_headcount = max(0, total_employees - billable_headcount - bench_headcount - notice_period)

        cur.execute("""
            SELECT COALESCE(SUM(pa.allocation_percentage), 0)
            FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id = m.employee_id
            WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
            AND m.date_of_resign IS NULL
        """)
        total_allocations = cur.fetchone()[0]
        
        active_headcount = max(1, total_employees - notice_period) # Avoid division by zero
        company_utilization = round((total_allocations / (active_headcount * 100)) * 100)

        cur.execute("""
            SELECT COUNT(DISTINCT pa.employee_id) 
            FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id = m.employee_id
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND m.date_of_resign IS NULL
        """)
        upcoming_bench = cur.fetchone()[0]

        cur.execute("""
            SELECT s.skill_name, count(es.employee_id) as c
            FROM employee_skills es
            JOIN skills s ON s.skill_id = es.skill_id
            LEFT JOIN employee_master_pro emp ON emp.employee_id = es.employee_id
            LEFT JOIN employee_master m ON m.employee_id = es.employee_id
            WHERE (emp.employee_status NOT ILIKE '%notice%' OR emp.employee_status IS NULL)
            AND m.date_of_resign IS NULL
            AND COALESCE(emp.employee_allocations, 0) <= 0
            GROUP BY s.skill_name ORDER BY c DESC LIMIT 5
        """)
        bench_skills = [{"name": r[0], "count": r[1]} for r in cur.fetchall()]

        cur.execute("""
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', CURRENT_DATE),
                    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 months',
                    INTERVAL '1 month'
                ) AS month_start
            )
            SELECT
                TO_CHAR(m.month_start, 'Mon') AS month,
                COUNT(DISTINCT pa.employee_id) AS allocations
            FROM months m
            LEFT JOIN projects_allocation pa
              ON pa.allocation_start_date <= (m.month_start + INTERVAL '1 month' - INTERVAL '1 day')
             AND (pa.allocation_end_date >= m.month_start OR pa.allocation_end_date IS NULL)
            GROUP BY m.month_start
            ORDER BY m.month_start
        """)
        forecast_rows = cur.fetchall()
        forecast = []
        for r in forecast_rows:
            forecast.append({
                "month": r[0],
                "capacity": r[1] + bench_headcount,
                "demand": r[1] + int(r[1] * 0.1)
            })

        cur.execute("""
            SELECT p.project_name, count(pa.employee_id) as res_count
            FROM projects p
            LEFT JOIN projects_allocation pa ON pa.project_id = p.project_id
            GROUP BY p.project_name
            ORDER BY res_count ASC
            LIMIT 3
        """)
        risk_rows = cur.fetchall()
        projects_at_risk = []
        for r in risk_rows:
            if r[1] == 0:
                projects_at_risk.append({"name": r[0], "client": "Internal", "risk": "High", "reason": "No resources assigned", "health": 20})
            elif r[1] < 3:
                projects_at_risk.append({"name": r[0], "client": "Internal", "risk": "Medium", "reason": f"Under-resourced ({r[1]} member(s))", "health": 55})

        alerts = []
        if upcoming_bench > 0:
            alerts.append({"id": 1, "type": "warning", "message": f"{upcoming_bench} resources are rolling off within 30 days.", "time": "Just now"})
        if bench_headcount > 10:
             alerts.append({"id": 2, "type": "critical", "message": f"High bench count detected ({bench_headcount} employees idle).", "time": "Recently"})
        
        if len(alerts) == 0:
            alerts.append({"id": 3, "type": "info", "message": "All project allocations appear stable.", "time": "Just now"})
        
        return {
            "company_utilization": company_utilization,
            "billable_headcount": billable_headcount,
            "bench_headcount": bench_headcount,
            "notice_period": notice_period,
            "internal_headcount": internal_headcount,
            "upcoming_bench": upcoming_bench,
            "bench_skills": bench_skills,
            "forecast": forecast,
            "projects_at_risk": projects_at_risk,
            "alerts": alerts,
            "total_employees": total_employees
        }
    except Exception as e:
        print("REAL DB ERROR EXECUTIVE METRICS:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
