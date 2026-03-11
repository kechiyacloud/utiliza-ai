from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.database import get_db_connection
from pydantic import BaseModel
import io
import csv

class TodoItem(BaseModel):
    message: str
    type: str = "info"


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

@router.get("/dashboard/recent-transitions")
def recent_transitions():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT e.employee_name, p.project_name, pa.allocation_start_date, pa.role_in_project
            FROM projects_allocation pa
            JOIN employee_master e ON e.employee_id = pa.employee_id
            JOIN projects p ON p.project_id = pa.project_id
            ORDER BY pa.allocation_start_date DESC
            LIMIT 5
        """)
        rows = cur.fetchall()
        return [
            {
                "employee": r[0],
                "project": r[1],
                "date": r[2],
                "role": r[3]
            }
            for r in rows
        ]
    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/certification-expiry")
def certification_expiry():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Since DB lacks expiry_date, we return an empty list for now
        # but with the intended structure for the frontend to handle.
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
                projects_at_risk.append({"name": r[0], "client": "Internal", "risk": "High", "reason": f"No resources ({r[1]} members)", "health": 20})
            elif r[1] < 3:
                projects_at_risk.append({"name": r[0], "client": "Internal", "risk": "Medium", "reason": f"Under-resourced ({r[1]} members)", "health": 55})
            else:
                projects_at_risk.append({"name": r[0], "client": "Internal", "risk": "Low", "reason": f"Sufficient ({r[1]} members)", "health": 100})

        alerts = []
        if upcoming_bench > 0:
            alerts.append({"id": 1, "type": "warning", "message": f"{upcoming_bench} resources are rolling off within 30 days.", "time": "Just now"})
        if bench_headcount > 10:
             alerts.append({"id": 2, "type": "critical", "message": f"High bench count detected ({bench_headcount} employees idle).", "time": "Recently"})
        
        if len(alerts) == 0:
            alerts.append({"id": 3, "type": "info", "message": "All project allocations appear stable.", "time": "Just now"})
        
        cur.execute("""
            SELECT e.employee_name, CURRENT_DATE - COALESCE(MAX(pa.allocation_end_date), e.date_of_joining) as days_on_bench
            FROM employee_master e
            LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
            LEFT JOIN projects_allocation pa ON e.employee_id = pa.employee_id
            WHERE (p.employee_status NOT ILIKE '%notice%' OR p.employee_status IS NULL)
            AND e.date_of_resign IS NULL
            AND COALESCE(p.employee_allocations, 0) <= 0
            GROUP BY e.employee_name, e.date_of_joining
            ORDER BY days_on_bench DESC
            LIMIT 5
        """)
        bench_aging_rows = cur.fetchall()
        bench_aging = [{"name": r[0], "days": r[1]} for r in bench_aging_rows]

        # Strategic What-If Predictor
        target_util = 85
        if company_utilization < target_util:
            # How many more resources needed to be billable to hit target
            gap = round(((target_util/100) * active_headcount) - (total_allocations/100))
            util_prediction = {
                "tip": f"Deploy {max(1, gap)} more resources to hit your {target_util}% target.",
                "target": target_util,
                "gap": max(1, gap)
            }
        else:
            util_prediction = {
                "tip": "Utilization target achieved. Focus on project health.",
                "target": target_util,
                "gap": 0
            }

        cur.execute("""
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
                    DATE_TRUNC('month', CURRENT_DATE),
                    INTERVAL '1 month'
                ) AS month_start
            )
            SELECT 
                TO_CHAR(m.month_start, 'Mon') as month,
                (SELECT COUNT(DISTINCT pa.employee_id) 
                 FROM projects_allocation pa 
                 WHERE pa.allocation_start_date <= (m.month_start + INTERVAL '1 month' - INTERVAL '1 day')
                 AND (pa.allocation_end_date >= m.month_start OR pa.allocation_end_date IS NULL)
                ) as billable_count
            FROM months m
            ORDER BY m.month_start
        """)
        trend_rows = cur.fetchall()
        utilization_trends = [{"month": r[0], "value": r[1]} for r in trend_rows]

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
            "total_employees": total_employees,
            "bench_aging": bench_aging,
            "utilization_prediction": util_prediction,
            "utilization_trends": utilization_trends
        }
    except Exception as e:
        print("REAL DB ERROR EXECUTIVE METRICS:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ----------------- ACTIONABLE TODOS -----------------

def create_todos_table_if_not_exists():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS actionable_todos (
                id SERIAL PRIMARY KEY,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    except Exception as e:
        print("Error creating actionable_todos table:", e)
    finally:
        cur.close()
        conn.close()

@router.get("/dashboard/todos")
def get_todos():
    create_todos_table_if_not_exists()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, message, type, status, created_at FROM actionable_todos ORDER BY created_at DESC")
        rows = cur.fetchall()
        return [
            {
                "id": r[0],
                "message": r[1],
                "type": r[2],
                "status": r[3],
                "time": r[4].strftime("%I:%M %p") if r[4] else "Just now"
            }
            for r in rows
        ]
    except Exception as e:
        print("GET TODOS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.post("/dashboard/todos")
def add_todo(todo: TodoItem):
    create_todos_table_if_not_exists()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO actionable_todos (message, type, status) VALUES (%s, %s, 'pending') RETURNING id, message, type, status, created_at",
            (todo.message, todo.type)
        )
        conn.commit()
        r = cur.fetchone()
        return {
            "id": r[0],
            "message": r[1],
            "type": r[2],
            "status": r[3],
            "time": r[4].strftime("%I:%M %p") if r[4] else "Just now"
        }
    except Exception as e:
        print("POST TODOS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.put("/dashboard/todos/{todo_id}/toggle")
def toggle_todo(todo_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT status FROM actionable_todos WHERE id = %s", (todo_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        new_status = 'completed' if row[0] == 'pending' else 'pending'

        cur.execute("UPDATE actionable_todos SET status = %s WHERE id = %s RETURNING status", (new_status, todo_id))
        conn.commit()
        return {"id": todo_id, "status": cur.fetchone()[0]}
    except Exception as e:
        print("PUT TODOS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.delete("/dashboard/todos/{todo_id}")
def delete_todo(todo_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM actionable_todos WHERE id = %s", (todo_id,))
        conn.commit()
        return {"detail": "Todo deleted successfully"}
    except Exception as e:
        print("DELETE TODOS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ----------------- CSV EXPORT RISK BOARD -----------------

@router.get("/dashboard/export-risk-board")
def export_risk_board():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT p.project_name, count(pa.employee_id) as res_count
            FROM projects p
            LEFT JOIN projects_allocation pa ON pa.project_id = p.project_id
            GROUP BY p.project_name
            ORDER BY res_count ASC
        """)
        risk_rows = cur.fetchall()
        projects_at_risk = []
        for r in risk_rows:
            if r[1] == 0:
                projects_at_risk.append([r[0], "Internal", "High", "No resources assigned", r[1], 20])
            elif r[1] < 3:
                projects_at_risk.append([r[0], "Internal", "Medium", f"Under-resourced ({r[1]} member(s))", r[1], 55])
            else:
                projects_at_risk.append([r[0], "Internal", "Low", "Sufficient resources", r[1], 100])

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Project Name", "Client", "Delivery Risk", "Risk Reason", "Resource Count", "Health %"])
        writer.writerows(projects_at_risk)
        
        output.seek(0)
        return StreamingResponse(
            output, 
            media_type="text/csv", 
            headers={"Content-Disposition": "attachment; filename=delivery_risk_board.csv"}
        )

    except Exception as e:
        print("CSV EXPORT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
