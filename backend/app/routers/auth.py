from fastapi import APIRouter, HTTPException
from app.database import get_db_connection

router = APIRouter()

@router.get("/dashboard/infocards")
def dashboard_infocards():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # ---- Total Employees ----
        try:
            cur.execute("SELECT COUNT(*) FROM employee_master")
            total_employees = cur.fetchone()[0]
        except:
            total_employees = 0

        # ---- Total Clients ----
        try:
            cur.execute("SELECT COUNT(*) FROM clients")
            total_clients = cur.fetchone()[0]
        except:
            total_clients = 0

        # ---- Running Projects ----
        try:
            cur.execute("""
                SELECT COUNT(*)
                FROM projects
                WHERE LOWER(project_status) = 'running'
            """)
            running_projects = cur.fetchone()[0]
        except:
            running_projects = 0

        # ---- Bench Employees ----
        try:
            cur.execute("""
                SELECT COUNT(*)
                FROM employee_master e
                LEFT JOIN projects_allocation p
                ON e.employee_id = p.employee_id
                AND p.allocation_end_date >= CURRENT_DATE
                WHERE p.employee_id IS NULL
            """)
            bench_employees = cur.fetchone()[0]
        except:
            bench_employees = 0

        return {
            "total_employees": total_employees,
            "total_clients": total_clients,
            "running_projects": running_projects,
            "bench_employees": bench_employees
        }

    finally:
        cur.close()
        conn.close()
