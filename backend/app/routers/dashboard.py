from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from app.database import get_db_connection, release_db_connection
from pydantic import BaseModel
import io
import csv

class TodoItem(BaseModel):
    message: str
    type: str = "info"

class TodoUpdate(BaseModel):
    message: str
    type: str = "info"


router = APIRouter()


from concurrent.futures import ThreadPoolExecutor


@router.get("/dashboard/all")
def get_dashboard_all(department: Optional[str] = Query(None)):
    """Consolidated endpoint to fetch all dashboard data in a single request."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    dept_m_filter = " AND m.department = %s " if department else ""
    dept_e_filter = " AND e.department = %s " if department else ""
    dept_params = (department,) if department else ()

    try:
        # ==============================================================
        # BATCH 1: infocards (4 counts combined into ONE query)
        # ==============================================================
        try:
            if department:
                cur.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM employee_master m WHERE m.date_of_resign IS NULL AND m.department = %s),
                        (SELECT COUNT(DISTINCT p.client_id) FROM projects p
                         JOIN projects_allocation pa ON p.project_id = pa.project_id
                         JOIN employee_master m ON pa.employee_id = m.employee_id
                         WHERE p.client_id IS NOT NULL AND m.department = %s AND m.date_of_resign IS NULL),
                        (SELECT COUNT(DISTINCT p.project_id) FROM projects p
                         JOIN projects_allocation pa ON p.project_id = pa.project_id
                         JOIN employee_master m ON pa.employee_id = m.employee_id
                         WHERE LOWER(p.project_status) IN ('running','in progress','live','active')
                           AND m.department = %s AND m.date_of_resign IS NULL),
                        (SELECT COUNT(DISTINCT m.employee_id)
                         FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                           AND m.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0
                           AND m.department = %s)
                """, (department, department, department, department))
            else:
                cur.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL),
                        (SELECT COUNT(*) FROM clients),
                        (SELECT COUNT(*) FROM projects WHERE LOWER(project_status) IN ('running','in progress','live','active')),
                        (SELECT COUNT(DISTINCT m.employee_id)
                         FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                           AND m.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0)
                """)
            row = cur.fetchone()
            infocards = {
                "total_employees": row[0], "total_clients": row[1],
                "running_projects": row[2], "bench_employees": row[3]
            }
        except Exception as e:
            conn.rollback()
            print("Error in Info Cards:", e)
            infocards = {"total_employees": 0, "total_clients": 0, "running_projects": 0, "bench_employees": 0}

        # ==============================================================
        # BATCH 2: Allocation 3M Forecast
        # ==============================================================
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
                    TO_CHAR(mo.month_start, 'YYYY-MM') AS month,
                    COALESCE(SUM(pa.allocation_percentage) / 100.0, 0) AS allocations
                FROM months mo
                LEFT JOIN projects_allocation pa
                  ON pa.allocation_start_date <= (mo.month_start + INTERVAL '1 month' - INTERVAL '1 day')
                 AND (pa.allocation_end_date >= mo.month_start OR pa.allocation_end_date IS NULL)
                LEFT JOIN employee_master e ON pa.employee_id = e.employee_id
                WHERE (e.date_of_resign IS NULL OR pa.employee_id IS NULL)
                """ + dept_e_filter.replace("AND", "AND (").replace("%s", "%s OR pa.employee_id IS NULL)") + """
                GROUP BY mo.month_start ORDER BY mo.month_start
            """, dept_params)
            allocation_3m = [{"month": r[0], "allocations": r[1]} for r in cur.fetchall()]
        except Exception as e:
            conn.rollback()
            print("Error in Allocation 3M:", e)
            allocation_3m = []

        # ==============================================================
        # BATCH 3: High Allocation Projects + Top Performers + Upcoming Availability
        #          (3 small queries, fast because they use indexed FKs)
        # ==============================================================
        try:
            cur.execute("""
                SELECT p.project_name, COUNT(pa.employee_id) AS resource_count
                FROM projects p
                JOIN projects_allocation pa ON p.project_id = pa.project_id
                JOIN employee_master e ON pa.employee_id = e.employee_id
                WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
                  AND e.date_of_resign IS NULL
                  AND LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                """ + dept_e_filter + """
                GROUP BY p.project_name ORDER BY resource_count DESC LIMIT 5
            """, dept_params)
            high_allocation = [{"project_name": r[0], "resource_count": r[1]} for r in cur.fetchall()]
        except Exception as e:
            conn.rollback(); print("Error in High Allocation:", e); high_allocation = []

        try:
            cur.execute("""
                SELECT e.employee_id, e.employee_name, e.role_designation, COALESCE(p.employee_allocations,0)
                FROM employee_master e
                LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
                WHERE e.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)>0
                """ + dept_e_filter + """
                ORDER BY p.employee_allocations DESC NULLS LAST LIMIT 5
            """, dept_params)
            top_performers = [{"employee_id": r[0],"employee_name": r[1],"role": r[2],"allocation": r[3]} for r in cur.fetchall()]
        except Exception as e:
            conn.rollback(); print("Error in Top Performers:", e); top_performers = []

        try:
            cur.execute("""
                SELECT e.employee_name, p.project_name, pa.allocation_end_date, pa.allocation_percentage
                FROM projects_allocation pa
                JOIN employee_master e ON e.employee_id = pa.employee_id
                JOIN projects p ON p.project_id = pa.project_id
                WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                """ + dept_e_filter + """
                ORDER BY pa.allocation_end_date
            """, dept_params)
            availability = [{"employee": r[0],"project": r[1],"release_date": r[2],"allocation_percent": r[3]} for r in cur.fetchall()]
        except Exception as e:
            conn.rollback(); print("Error in Availability:", e); availability = []

        # ==============================================================
        # BATCH 4: Recent Transitions + Certifications
        # ==============================================================
        try:
            cur.execute("""
                WITH ordered_transitions AS (
                    SELECT
                        e.employee_name, e.department,
                        COALESCE(pa.role_in_project, e.role_designation, 'Resource') AS role_in_project,
                        COALESCE(prev_project.project_name, 'Bench') AS from_project,
                        current_project.project_name AS to_project,
                        pa.allocation_start_date
                    FROM (
                        SELECT pa.*, LAG(pa.project_id) OVER (
                            PARTITION BY pa.employee_id
                            ORDER BY COALESCE(pa.allocation_start_date, CURRENT_DATE), pa.project_id
                        ) AS previous_project_id
                        FROM projects_allocation pa
                    ) pa
                    JOIN employee_master e ON e.employee_id = pa.employee_id
                    JOIN projects current_project ON current_project.project_id = pa.project_id
                    LEFT JOIN projects prev_project ON prev_project.project_id = pa.previous_project_id
                    WHERE pa.allocation_start_date IS NOT NULL
                )
                SELECT employee_name, from_project, to_project, allocation_start_date, role_in_project
                FROM ordered_transitions WHERE 1=1
                """ + dept_e_filter.replace("e.", "") + """
                ORDER BY allocation_start_date DESC LIMIT 5
            """, dept_params)
            transitions = [{"employee": r[0],"from_project": r[1],"to_project": r[2],"date": r[3],"role": r[4]} for r in cur.fetchall()]
        except Exception as e:
            conn.rollback(); print("Error in Transitions:", e); transitions = []

        try:
            cur.execute("""
                SELECT DISTINCT e.employee_name, 'Completed'
                FROM employee_certificates ec
                JOIN employee_master e ON ec.employee_id = e.employee_id
                WHERE 1=1 """ + dept_e_filter + """ ORDER BY e.employee_name
            """, dept_params)
            certifications = [{"employee": r[0],"expiry_date": r[1]} for r in cur.fetchall()]
        except Exception as e:
            conn.rollback(); print("Error in Certifications:", e); certifications = []

        # ==============================================================
        # BATCH 5: Skills Gap
        # ==============================================================
        try:
            cur.execute("""
                SELECT s.skill_name, COUNT(DISTINCT es.employee_id), COUNT(DISTINCT ps.project_id)
                FROM skills s
                LEFT JOIN employee_skills es ON s.skill_id = es.skill_id
                LEFT JOIN employee_master m ON es.employee_id = m.employee_id
                LEFT JOIN project_skills ps ON s.skill_id = ps.skill_id
                WHERE (m.department = %s OR %s IS NULL)
                GROUP BY s.skill_name
            """, (department, department))
            skills_gap = []
            for r in cur.fetchall():
                certified, demand = r[1] or 0, r[2] or 0
                gap = "high" if demand > certified else "medium" if demand == certified else "low"
                skills_gap.append({"skill": r[0], "certified": certified, "demand": demand, "gap": gap})
        except Exception as e:
            conn.rollback(); print("Error in Skills Gap:", e); skills_gap = []

        # ==============================================================
        # BATCH 6: Executive Metrics (combined into ONE large CTE query)
        # ==============================================================
        try:
            # Combined CTE to get all headcounts in one round trip
            if department:
                cur.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL AND department = %s),
                        (SELECT COUNT(*) FROM employee_master m JOIN employee_master_pro p ON m.employee_id=p.employee_id
                         WHERE p.employee_status ILIKE CHR(37)||'notice'||CHR(37) AND m.date_of_resign IS NULL AND m.department = %s),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                           AND LOWER(pa.project_tags)='billable' AND m.date_of_resign IS NULL AND m.department = %s),
                        (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                           AND m.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0 AND m.department = %s),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE+INTERVAL '30 days')
                           AND m.date_of_resign IS NULL AND m.department = %s)
                """, (department,) * 5)
            else:
                cur.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL),
                        (SELECT COUNT(*) FROM employee_master_pro WHERE employee_status ILIKE CHR(37)||'notice'||CHR(37)),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                           AND LOWER(pa.project_tags)='billable' AND m.date_of_resign IS NULL),
                        (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                           AND m.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE+INTERVAL '30 days')
                           AND m.date_of_resign IS NULL)
                """)
            hc_row = cur.fetchone()
            total_emp, notice_p, billable_hc, bench_hc, upcoming_bench = hc_row
            internal_hc = max(0, total_emp - billable_hc - bench_hc - notice_p)
            active_hc = max(1, total_emp - notice_p)

            # Utilization
            cur.execute("""
                WITH EmployeeAlloc AS (
                    SELECT m.employee_id,
                        LEAST(100, COALESCE(SUM(pa.allocation_percentage), 0)) as capped_alloc
                    FROM employee_master m
                    LEFT JOIN projects_allocation pa ON m.employee_id=pa.employee_id
                        AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                    LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
                    WHERE m.date_of_resign IS NULL
                      AND (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                    """ + dept_m_filter + """
                    GROUP BY m.employee_id
                )
                SELECT ROUND(AVG(capped_alloc)), SUM(capped_alloc) FROM EmployeeAlloc
            """, dept_params)
            util_row = cur.fetchone()
            utilization = int(util_row[0]) if util_row and util_row[0] else 0
            total_alloc = float(util_row[1]) if util_row and util_row[1] else 0

            # Bench skills
            cur.execute("""
                SELECT s.skill_name, count(es.employee_id) as c
                FROM employee_skills es
                JOIN skills s ON s.skill_id=es.skill_id
                LEFT JOIN employee_master_pro emp ON emp.employee_id=es.employee_id
                LEFT JOIN employee_master m ON m.employee_id=es.employee_id
                WHERE (emp.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR emp.employee_status IS NULL)
                  AND m.date_of_resign IS NULL AND COALESCE(emp.employee_allocations,0)<=0
                """ + dept_m_filter + """
                GROUP BY s.skill_name ORDER BY c DESC LIMIT 5
            """, dept_params)
            bench_skills = [{"name": r[0], "count": r[1]} for r in cur.fetchall()]

            # Forecast + trends combined
            cur.execute("""
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE),
                        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 months',
                        INTERVAL '1 month'
                    ) AS month_start
                )
                SELECT TO_CHAR(mo.month_start, 'Mon'),
                    COALESCE(SUM(pa.allocation_percentage)/100.0, 0)
                FROM months mo
                LEFT JOIN projects_allocation pa
                  ON pa.allocation_start_date<=(mo.month_start+INTERVAL '1 month'-INTERVAL '1 day')
                 AND (pa.allocation_end_date>=mo.month_start OR pa.allocation_end_date IS NULL)
                LEFT JOIN employee_master e ON pa.employee_id=e.employee_id
                WHERE 1=1
                """ + dept_e_filter.replace("AND", "AND (").replace("%s", "%s OR pa.employee_id IS NULL)") + """
                GROUP BY mo.month_start ORDER BY mo.month_start
            """, dept_params)
            forecast = []
            for r in cur.fetchall():
                alloc = float(r[1])
                forecast.append({"month": r[0], "allocated": round(alloc, 2), "available": round(max(float(active_hc)-alloc, 0), 2)})

            # Projects at risk
            if department:
                cur.execute("""
                    SELECT p.project_name, count(pa.employee_id) FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    LEFT JOIN employee_master e ON pa.employee_id=e.employee_id
                    WHERE (e.department=%s OR e.department IS NULL)
                    GROUP BY p.project_name ORDER BY count(pa.employee_id) ASC LIMIT 3
                """, dept_params)
            else:
                cur.execute("""
                    SELECT p.project_name, count(pa.employee_id) FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    GROUP BY p.project_name ORDER BY count(pa.employee_id) ASC LIMIT 3
                """)
            projects_at_risk = []
            for r in cur.fetchall():
                if r[1] == 0:
                    projects_at_risk.append({"name": r[0],"client":"Internal","risk":"High","reason": f"No resources ({r[1]} members)","health":20})
                elif r[1] < 3:
                    projects_at_risk.append({"name": r[0],"client":"Internal","risk":"Medium","reason": f"Under-resourced ({r[1]} members)","health":55})
                else:
                    projects_at_risk.append({"name": r[0],"client":"Internal","risk":"Low","reason": f"Sufficient ({r[1]} members)","health":100})

            alerts = []
            if upcoming_bench > 0:
                alerts.append({"id":1,"type":"warning","message": f"{upcoming_bench} resources are rolling off within 30 days.","time":"Just now"})
            if bench_hc > 10:
                alerts.append({"id":2,"type":"critical","message": f"High bench count detected ({bench_hc} employees idle).","time":"Recently"})
            if not alerts:
                alerts.append({"id":3,"type":"info","message":"All project allocations appear stable.","time":"Just now"})

            # Bench aging
            cur.execute("""
                SELECT e.employee_name, CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date),e.date_of_joining)
                FROM employee_master e
                LEFT JOIN employee_master_pro p ON e.employee_id=p.employee_id
                LEFT JOIN projects_allocation pa ON e.employee_id=pa.employee_id
                WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                  AND e.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0
                """ + dept_e_filter + """
                GROUP BY e.employee_name,e.date_of_joining ORDER BY 2 DESC LIMIT 5
            """, dept_params)
            bench_aging = [{"name": r[0], "days": r[1]} for r in cur.fetchall()]

            target_util = 85
            if utilization < target_util:
                gap = round(((target_util/100)*active_hc) - (total_alloc/100))
                util_prediction = {"tip": f"Deploy {max(1,gap)} more resources to hit your {target_util}% target.","target":target_util,"gap":max(1,gap)}
            else:
                util_prediction = {"tip":"Utilization target achieved. Focus on project health.","target":target_util,"gap":0}

            # Utilization trends (6-month historical)
            cur.execute("""
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE)-INTERVAL '5 months',
                        DATE_TRUNC('month', CURRENT_DATE),
                        INTERVAL '1 month'
                    ) AS month_start
                )
                SELECT TO_CHAR(mo.month_start,'Mon'),
                    COALESCE((SELECT SUM(pa.allocation_percentage)/100.0
                     FROM projects_allocation pa LEFT JOIN employee_master m ON pa.employee_id=m.employee_id
                     WHERE pa.allocation_start_date<=(mo.month_start+INTERVAL '1 month'-INTERVAL '1 day')
                       AND (pa.allocation_end_date>=mo.month_start OR pa.allocation_end_date IS NULL)
                     """ + dept_m_filter + """
                    ), 0) as billable_count
                FROM months mo ORDER BY mo.month_start
            """, dept_params)
            utilization_trends = [{"month": r[0], "value": r[1]} for r in cur.fetchall()]

            # Bench individual skills
            cur.execute("""
                SELECT e.employee_name, STRING_AGG(s.skill_name,', ')
                FROM employee_master e
                LEFT JOIN employee_master_pro p ON e.employee_id=p.employee_id
                LEFT JOIN employee_skills es ON e.employee_id=es.employee_id
                LEFT JOIN skills s ON es.skill_id=s.skill_id
                WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                  AND e.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0
                """ + dept_e_filter + """
                GROUP BY e.employee_name ORDER BY e.employee_name LIMIT 15
            """, dept_params)
            bench_indiv_skills = [{"name": r[0], "skills": r[1] or "No skills listed"} for r in cur.fetchall()]

            executive = {
                "company_utilization": utilization,
                "billable_headcount": billable_hc,
                "bench_headcount": bench_hc,
                "notice_period": notice_p,
                "internal_headcount": internal_hc,
                "total_employees": total_emp,
                "bench_skills": bench_skills,
                "bench_individual_skills": bench_indiv_skills,
                "upcoming_bench": upcoming_bench,
                "forecast": forecast,
                "projects_at_risk": projects_at_risk,
                "alerts": alerts,
                "bench_aging": bench_aging,
                "utilization_prediction": util_prediction,
                "utilization_trends": utilization_trends
            }
        except Exception as e:
            import traceback
            conn.rollback()
            print("Error in Executive Metrics:", e)
            executive = {"error": traceback.format_exc()}

        # ==============================================================
        # BATCH 7: Todos (dynamic risk insights + manual todos)
        # ==============================================================
        try:
            dynamic_todos = []
            todo_counter = 1

            # All 3 todo triggers in one query using UNION ALL
            if department:
                cur.execute("""
                    SELECT 'understaffed', p.project_name, count(pa.employee_id)::text FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    LEFT JOIN employee_master e ON pa.employee_id=e.employee_id
                    WHERE LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'complete'||CHR(37)
                      AND (e.department=%s OR e.department IS NULL)
                    GROUP BY p.project_name HAVING count(pa.employee_id)<3 LIMIT 3
                UNION ALL
                    SELECT 'deadline', p.project_name, '' FROM projects p
                    JOIN projects_allocation pa ON pa.project_id=p.project_id
                    JOIN employee_master e ON e.employee_id=pa.employee_id
                    WHERE p.end_date IS NULL
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'complete'||CHR(37)
                      AND e.department=%s LIMIT 3
                UNION ALL
                    SELECT 'bench', e.employee_name,
                        (CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date),e.date_of_joining))::text
                    FROM employee_master e
                    LEFT JOIN employee_master_pro p ON e.employee_id=p.employee_id
                    LEFT JOIN projects_allocation pa ON e.employee_id=pa.employee_id
                    WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                      AND e.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0 AND e.department=%s
                    GROUP BY e.employee_name,e.date_of_joining
                    HAVING CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date),e.date_of_joining)>30 LIMIT 3
                """, (department, department, department))
            else:
                cur.execute("""
                    SELECT 'understaffed', p.project_name, count(pa.employee_id)::text FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    WHERE LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'complete'||CHR(37)
                    GROUP BY p.project_name HAVING count(pa.employee_id)<3 LIMIT 3
                UNION ALL
                    SELECT 'deadline', project_name, '' FROM projects
                    WHERE end_date IS NULL
                      AND LOWER(project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(project_status) NOT LIKE CHR(37)||'complete'||CHR(37) LIMIT 3
                UNION ALL
                    SELECT 'bench', e.employee_name,
                        (CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date),e.date_of_joining))::text
                    FROM employee_master e
                    LEFT JOIN employee_master_pro p ON e.employee_id=p.employee_id
                    LEFT JOIN projects_allocation pa ON e.employee_id=pa.employee_id
                    WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                      AND e.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0
                    GROUP BY e.employee_name,e.date_of_joining
                    HAVING CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date),e.date_of_joining)>30 LIMIT 3
                """)
            for r in cur.fetchall():
                kind, name, extra = r
                if kind == 'understaffed':
                    dynamic_todos.append({"id": f"risk-{todo_counter}","priority":"High","color":"rose","icon":"ShieldAlert",
                        "title": f"Understaffed: {name}","detail": f"Project has only {extra} resources. Assign min. 3.","actionType":"project"})
                elif kind == 'deadline':
                    dynamic_todos.append({"id": f"risk-{todo_counter}","priority":"Medium","color":"amber","icon":"Clock",
                        "title": f"Missing deadline: {name}","detail":"Set delivery deadlines on all running projects.","actionType":"project"})
                elif kind == 'bench':
                    dynamic_todos.append({"id": f"risk-{todo_counter}","priority":"High","color":"rose","icon":"AlertCircle",
                        "title": f"Critical Bench: {name}","detail": f"Resource idle for {extra} days. Redeploy immediately.","actionType":"allocation"})
                todo_counter += 1

            if not dynamic_todos:
                dynamic_todos.append({"id":"risk-0","priority":"Low","color":"emerald","icon":"CheckCircle2",
                    "title":"All systems nominal","detail":"No critical risks detected.","actionType":"none"})

            try:
                cur.execute("SELECT id, message, type, status, created_at FROM actionable_todos ORDER BY created_at DESC")
                manual_todos = [{"id": f"manual-{r[0]}","message":r[1],"type":r[2],"status":r[3],
                    "time": r[4].strftime("%I:%M %p") if r[4] else "Just now","isSystemSuggestion":False}
                    for r in cur.fetchall()]
            except Exception:
                conn.rollback(); manual_todos = []

            system_suggestions = [{"id": f"sys-{item['id']}","message": f"{item['title']}: {item['detail']}",
                "type":"critical" if item['priority']=='High' else "warning","status":"pending","time":"System",
                "isSystemSuggestion":True,"actionType":item.get('actionType')}
                for item in dynamic_todos if item.get('id') != "risk-0"]

            todos = system_suggestions + manual_todos
            risk_insights = dynamic_todos

        except Exception as e:
            conn.rollback()
            print("Error in Todos:", e)
            risk_insights = []; todos = []

        return {
            "infocards": infocards,
            "allocation_3m": allocation_3m,
            "high_allocation": high_allocation,
            "top_performers": top_performers,
            "availability": availability,
            "transitions": transitions,
            "certifications": certifications,
            "skills_gap": skills_gap,
            "executive": executive,
            "risk_insights": risk_insights,
            "todos": todos
        }
    except Exception as e:
        print("MEGA DASHBOARD ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/dashboard/infocards")
def dashboard_infocards():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # ---- Total Employees ----
        cur.execute("SELECT COUNT(*) FROM employee_master")
        total_employees = cur.fetchone()[0]

        # ---- Total Clients ----
        cur.execute("SELECT COUNT(*) FROM clients")
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
            WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
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
        release_db_connection(conn)

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
            FROM months mo
            LEFT JOIN projects_allocation pa
              ON pa.allocation_start_date <= (mo.month_start + INTERVAL '1 month' - INTERVAL '1 day')
             AND (pa.allocation_end_date >= mo.month_start OR pa.allocation_end_date IS NULL)
            LEFT JOIN employee_master e ON pa.employee_id = e.employee_id
            WHERE e.date_of_resign IS NULL OR pa.employee_id IS NULL
            GROUP BY mo.month_start
            ORDER BY mo.month_start
        """)

        rows = cur.fetchall()

        return [
            {"month": r[0], "allocations": r[1]}
            for r in rows
        ]

    finally:
        cur.close()
        release_db_connection(conn)

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
            AND LOWER(p.project_status) NOT LIKE CHR(37) || 'end' || CHR(37)
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
        release_db_connection(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)

@router.get("/dashboard/recent-transitions")
def recent_transitions():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            WITH ordered_transitions AS (
                SELECT
                    pa.employee_id,
                    e.employee_name,
                    COALESCE(pa.role_in_project, e.role_designation, 'Resource') AS role_in_project,
                    COALESCE(prev_project.project_name, 'Bench') AS from_project,
                    current_project.project_name AS to_project,
                    pa.allocation_start_date
                FROM (
                    SELECT
                        pa.*,
                        LAG(pa.project_id) OVER (
                            PARTITION BY pa.employee_id
                            ORDER BY COALESCE(pa.allocation_start_date, CURRENT_DATE), pa.project_id
                        ) AS previous_project_id
                    FROM projects_allocation pa
                ) pa
                JOIN employee_master e ON e.employee_id = pa.employee_id
                JOIN projects current_project ON current_project.project_id = pa.project_id
                LEFT JOIN projects prev_project ON prev_project.project_id = pa.previous_project_id
                WHERE pa.allocation_start_date IS NOT NULL
            )
            SELECT employee_name, from_project, to_project, allocation_start_date, role_in_project
            FROM ordered_transitions
            ORDER BY allocation_start_date DESC
            LIMIT 5
        """)
        rows = cur.fetchall()
        return [
            {
                "employee": r[0],
                "from_project": r[1],
                "to_project": r[2],
                "date": r[3],
                "role": r[4]
            }
            for r in rows
        ]
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/dashboard/certification-expiry")
def certification_expiry():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT DISTINCT e.employee_name, 'Completed' AS expiry_status
            FROM employee_certificates ec
            JOIN employee_master e ON ec.employee_id = e.employee_id
            ORDER BY e.employee_name
        """)
        return [
            {
                "employee": r[0],
                "expiry_date": r[1]
            }
            for r in cur.fetchall()
        ]
    finally:
        cur.close()
        release_db_connection(conn)

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
        release_db_connection(conn)


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
            WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
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
            WHERE (emp.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR emp.employee_status IS NULL)
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
                TO_CHAR(mo.month_start, 'Mon') AS month,
                COUNT(DISTINCT pa.employee_id) AS allocations
            FROM months mo
            LEFT JOIN projects_allocation pa
              ON pa.allocation_start_date <= (mo.month_start + INTERVAL '1 month' - INTERVAL '1 day')
             AND (pa.allocation_end_date >= mo.month_start OR pa.allocation_end_date IS NULL)
            GROUP BY mo.month_start
            ORDER BY mo.month_start
        """)
        forecast_rows = cur.fetchall()
        forecast = []
        for r in forecast_rows:
            alloc = float(r[1])
            forecast.append({
                "month": r[0],
                "allocated": round(alloc, 2),
                "available": round(max(float(active_headcount) - alloc, 0), 2)
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
            WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
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
                TO_CHAR(mo.month_start, 'Mon') as month,
                (SELECT COUNT(DISTINCT pa.employee_id) 
                 FROM projects_allocation pa 
                 WHERE pa.allocation_start_date <= (mo.month_start + INTERVAL '1 month' - INTERVAL '1 day')
                 AND (pa.allocation_end_date >= mo.month_start OR pa.allocation_end_date IS NULL)
                ) as billable_count
            FROM months mo
            ORDER BY mo.month_start
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
        release_db_connection(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)

@router.put("/dashboard/todos/{todo_id}")
def update_todo(todo_id: int, todo: TodoUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE actionable_todos
            SET message = %s, type = %s
            WHERE id = %s
            RETURNING id, message, type, status, created_at
        """, (todo.message, todo.type, todo_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Todo not found")
        conn.commit()
        return {
            "id": row[0],
            "message": row[1],
            "type": row[2],
            "status": row[3],
            "time": row[4].strftime("%I:%M %p") if row[4] else "Just now"
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print("UPDATE TODOS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)
