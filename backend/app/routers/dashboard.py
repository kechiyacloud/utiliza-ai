from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from app.database import get_db_connection, release_db_connection, db_cursor
from pydantic import BaseModel
import io
import csv
from datetime import datetime

class TodoItem(BaseModel):
    message: str
    type: str = "info"

class TodoUpdate(BaseModel):
    message: str
    type: str = "info"

router = APIRouter()

@router.get("/dashboard/departments")
async def get_departments():
    with db_cursor() as cur:
        cur.execute("SELECT DISTINCT department FROM employee_master WHERE department IS NOT NULL AND department != '' ORDER BY department")
        depts = [r[0] for r in cur.fetchall()]
        return depts

@router.get("/dashboard/all")
def get_dashboard_all(department: Optional[str] = None):
    """Consolidated endpoint to fetch all dashboard data in a single request."""
    print(f"API: Fetching dashboard data (dept={department})...")
    with db_cursor() as cur:
        # Support multiple departments via comma-separated string
        dept_list = [d.strip() for d in department.split(',')] if department and department != 'Overall' else []
        
        if dept_list:
            dept_m_filter = " AND m.department = ANY(%s) "
            dept_e_filter = " AND e.department = ANY(%s) "
            dept_e_with_null = " AND (e.department = ANY(%s) OR pa.employee_id IS NULL) "
            dept_params = (dept_list,)
        else:
            dept_m_filter = ""
            dept_e_filter = ""
            dept_e_with_null = ""
            dept_params = ()

        # ==============================================================
        # BATCH 1: Info Cards (Total Employees, Clients, Projects, Bench)
        # ==============================================================
        print(" -> Batch 1: Info Cards")
        try:
            if dept_list:
                cur.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM employee_master m WHERE date_of_resign IS NULL AND m.department = ANY(%s)),
                        (SELECT COUNT(*) FROM clients),
                        (SELECT COUNT(*) FROM projects),
                        (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
                         AND m.date_of_resign IS NULL AND m.department = ANY(%s)
                         AND COALESCE((SELECT SUM(pa.allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)), 0) <= 0)
                """, (dept_list, dept_list))
            else:
                cur.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL),
                        (SELECT COUNT(*) FROM clients),
                        (SELECT COUNT(*) FROM projects),
                        (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
                         AND m.date_of_resign IS NULL
                         AND COALESCE((SELECT SUM(pa.allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)), 0) <= 0)
                """)
            infocards_row = cur.fetchone()
            infocards = {
                "total_employees": infocards_row[0],
                "total_clients": infocards_row[1],
                "running_projects": infocards_row[2],
                "bench_employees": infocards_row[3]
            }
        except Exception as e:
            print("Error in Info Cards:", e)
            infocards = {"total_employees": 0, "total_clients": 0, "running_projects": 0, "bench_employees": 0}

        # ==============================================================
        # BATCH 2: Allocation 3M Forecast
        # ==============================================================
        print(" -> Batch 2: Allocation 3M")
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
                """ + dept_e_with_null + """
                GROUP BY mo.month_start ORDER BY mo.month_start
            """, dept_params)
            allocation_3m = [{"month": r[0], "allocations": float(r[1])} for r in cur.fetchall()]
        except Exception as e:
            print("Error in Allocation 3M:", e)
            allocation_3m = []

        # ==============================================================
        # BATCH 3: High Allocation Projects + Top Performers + Upcoming Availability
        # ==============================================================
        print(" -> Batch 3: Projects & Performers")
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
            print("Error in High Allocation:", e); high_allocation = []

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
            print("Error in Top Performers:", e); top_performers = []

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
            print("Error in Availability:", e); availability = []

        # ==============================================================
        # BATCH 4: Recent Transitions + Certifications
        # ==============================================================
        print(" -> Batch 4: Transitions")
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
            print("Error in Transitions:", e); transitions = []

        try:
            cur.execute("""
                SELECT e.employee_name, c.certificate_name, ec.expiry_date
                FROM employee_certificates ec
                JOIN employee_master e ON ec.employee_id = e.employee_id
                JOIN certificates c ON ec.certificate_id = c.certificate_id
                WHERE 1=1 """ + dept_e_filter + """ ORDER BY ec.expiry_date ASC
            """, dept_params)
            certifications = [{"employee": r[0], "certificate_name": r[1], "expiry_date": r[2]} for r in cur.fetchall()]
        except Exception as e:
            print("Error in Certifications:", e); certifications = []

        # ==============================================================
        # BATCH 5: Skills Gap
        # ==============================================================
        print(" -> Batch 5: Skills Gap")
        try:
            cur.execute("""
                SELECT s.skill_name, COUNT(DISTINCT es.employee_id), COUNT(DISTINCT ps.project_id)
                FROM skills s
                LEFT JOIN employee_skills es ON s.skill_id = es.skill_id
                LEFT JOIN employee_master m ON es.employee_id = m.employee_id
                LEFT JOIN project_skills ps ON s.skill_id = ps.skill_id
                WHERE (m.department = ANY(%s) OR %s IS NULL)
                GROUP BY s.skill_name
            """, (dept_list, department))
            skills_gap = []
            for r in cur.fetchall():
                avail, alloc = r[1] or 0, r[2] or 0
                gap = "high" if alloc > avail else "medium" if alloc == avail else "low"
                skills_gap.append({"skill": r[0], "availability": avail, "allocated": alloc, "gap": gap})
        except Exception as e:
            print("Error in Skills Gap:", e); skills_gap = []

        # ==============================================================
        # BATCH 6: Executive Metrics (combined into ONE large CTE query)
        # ==============================================================
        print(" -> Batch 6: Executive Metrics")
        try:
            # Combined CTE to get all headcounts in one round trip
            if dept_list:
                cur.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL AND department = ANY(%s)),
                        (SELECT COUNT(*) FROM employee_master m JOIN employee_master_pro p ON m.employee_id=p.employee_id
                         WHERE p.employee_status ILIKE CHR(37)||'notice'||CHR(37) AND m.date_of_resign IS NULL AND m.department = ANY(%s)),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                           AND LOWER(pa.project_tags)='billable' AND m.date_of_resign IS NULL AND m.department = ANY(%s) AND pa.allocation_percentage > 0),
                        (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                           AND m.date_of_resign IS NULL AND m.department = ANY(%s)
                           AND COALESCE((SELECT SUM(pa.allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)), 0) <= 0),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE+INTERVAL '30 days')
                           AND m.date_of_resign IS NULL AND m.department = ANY(%s))
                """, (dept_list, dept_list, dept_list, dept_list, dept_list))
            else:
                cur.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL),
                        (SELECT COUNT(*) FROM employee_master_pro WHERE employee_status ILIKE CHR(37)||'notice'||CHR(37)),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                           AND LOWER(pa.project_tags)='billable' AND m.date_of_resign IS NULL AND pa.allocation_percentage > 0),
                        (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                         LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
                         WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                           AND m.date_of_resign IS NULL
                           AND COALESCE((SELECT SUM(pa.allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)), 0) <= 0),
                        (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                         JOIN employee_master m ON pa.employee_id=m.employee_id
                         WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE+INTERVAL '30 days')
                           AND m.date_of_resign IS NULL)
                """)
            hc_row = cur.fetchone()
            total_emp, notice_p, billable_hc, bench_hc, upcoming_bench = hc_row
            internal_hc = max(0, total_emp - billable_hc - bench_hc - notice_p)
            active_hc = max(1, total_emp - notice_p)

            # Utilization (Billable Only)
            cur.execute("""
                WITH EmployeeAlloc AS (
                    SELECT m.employee_id,
                        LEAST(100, COALESCE(SUM(pa.allocation_percentage) FILTER (WHERE LOWER(pa.project_tags) = 'billable'), 0)) as capped_alloc
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
                  AND m.date_of_resign IS NULL 
                  AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 WHERE pa2.employee_id = m.employee_id AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)), 0) <= 0
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
                """ + dept_e_with_null + """
                GROUP BY mo.month_start ORDER BY mo.month_start
            """, dept_params)
            forecast = []
            for r in cur.fetchall():
                alloc = float(r[1])
                forecast.append({"month": r[0], "allocated": round(alloc, 2), "availability": round(max(float(active_hc)-alloc, 0), 2)})

            # Projects at risk
            if dept_list:
                cur.execute("""
                    SELECT p.project_name, count(pa.employee_id) FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    LEFT JOIN employee_master e ON pa.employee_id=e.employee_id
                    WHERE (e.department=ANY(%s) OR e.department IS NULL)
                    GROUP BY p.project_name ORDER BY count(pa.employee_id) ASC LIMIT 3
                """, (dept_list,))
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

            cur.execute("""
                WITH BenchStats AS (
                    SELECT 
                        e.employee_name, 
                        CURRENT_DATE - COALESCE(MAX(pa.allocation_end_date) FILTER (WHERE pa.allocation_end_date <= CURRENT_DATE), e.date_of_joining, CURRENT_DATE) as total_days,
                        DATE_TRUNC('year', CURRENT_DATE)::DATE as year_start
                    FROM employee_master e
                    LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
                    LEFT JOIN projects_allocation pa ON e.employee_id = pa.employee_id
                    WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
                      AND e.date_of_resign IS NULL 
                      AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 WHERE pa2.employee_id = e.employee_id AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)), 0) <= 0
                    """ + dept_e_filter + """
                    GROUP BY e.employee_name, e.date_of_joining
                )
                SELECT 
                    employee_name, 
                    total_days, 
                    LEAST(total_days, (CURRENT_DATE - year_start)) as days_in_year,
                    ROUND((LEAST(total_days, (CURRENT_DATE - year_start))::float / NULLIF((CURRENT_DATE - year_start), 0)) * 100) as year_percentage
                FROM BenchStats
                ORDER BY total_days DESC LIMIT 5
            """, dept_params)
            bench_aging = [{"name": r[0], "days": r[1], "days_in_year": r[2], "year_percentage": r[3]} for r in cur.fetchall()]

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
            utilization_trends = [{"month": r[0], "value": float(r[1])} for r in cur.fetchall()]

            # Bench individual skills
            cur.execute("""
                SELECT e.employee_name, STRING_AGG(s.skill_name,', ')
                FROM employee_master e
                LEFT JOIN employee_master_pro p ON e.employee_id=p.employee_id
                LEFT JOIN employee_skills es ON e.employee_id=es.employee_id
                LEFT JOIN skills s ON es.skill_id=s.skill_id
                WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                  AND e.date_of_resign IS NULL 
                  AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 WHERE pa2.employee_id = e.employee_id AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)), 0) <= 0
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
            print("Error in Executive Metrics:", e)
            executive = {"error": traceback.format_exc()}

        # ==============================================================
        # BATCH 7: Todos (dynamic risk insights + manual todos)
        # ==============================================================
        print(" -> Batch 7: Todos")
        try:
            dynamic_todos = []
            todo_counter = 1

            # Risk triggers
            if dept_list:
                cur.execute("""
                    (SELECT 'understaffed', p.project_name, count(pa.employee_id)::text FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    LEFT JOIN employee_master e ON pa.employee_id=e.employee_id
                    WHERE LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'complete'||CHR(37)
                      AND (e.department=ANY(%s) OR e.department IS NULL)
                    GROUP BY p.project_name HAVING count(pa.employee_id)<3 LIMIT 3)
                UNION ALL
                    (SELECT 'deadline', p.project_name, '' FROM projects p
                    JOIN projects_allocation pa ON pa.project_id=p.project_id
                    JOIN employee_master e ON e.employee_id=pa.employee_id
                    WHERE p.end_date IS NULL
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'complete'||CHR(37)
                      AND e.department=ANY(%s) LIMIT 3)
                UNION ALL
                    (SELECT 'bench', e.employee_name,
                        (CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date) FILTER (WHERE pa.allocation_end_date <= CURRENT_DATE), e.date_of_joining, CURRENT_DATE))::text
                    FROM employee_master e
                    LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
                    LEFT JOIN projects_allocation pa ON e.employee_id = pa.employee_id
                    WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
                      AND e.date_of_resign IS NULL 
                      AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 WHERE pa2.employee_id = e.employee_id AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)), 0) <= 0
                      AND e.department=ANY(%s)
                    GROUP BY e.employee_name,e.date_of_joining
                    HAVING CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date) FILTER (WHERE pa.allocation_end_date <= CURRENT_DATE), e.date_of_joining, CURRENT_DATE)>30 LIMIT 3)
                """, (dept_list, dept_list, dept_list))
            else:
                cur.execute("""
                    (SELECT 'understaffed', p.project_name, count(pa.employee_id)::text FROM projects p
                    LEFT JOIN projects_allocation pa ON pa.project_id=p.project_id
                    WHERE LOWER(p.project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(p.project_status) NOT LIKE CHR(37)||'complete'||CHR(37)
                    GROUP BY p.project_name HAVING count(pa.employee_id)<3 LIMIT 3)
                UNION ALL
                    (SELECT 'deadline', project_name, '' FROM projects
                    WHERE end_date IS NULL
                      AND LOWER(project_status) NOT LIKE CHR(37)||'end'||CHR(37)
                      AND LOWER(project_status) NOT LIKE CHR(37)||'complete'||CHR(37) LIMIT 3)
                UNION ALL
                    (SELECT 'bench', e.employee_name,
                        (CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date) FILTER (WHERE pa.allocation_end_date <= CURRENT_DATE), e.date_of_joining, CURRENT_DATE))::text
                    FROM employee_master e
                    LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
                    LEFT JOIN projects_allocation pa ON e.employee_id = pa.employee_id
                    WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
                      AND e.date_of_resign IS NULL 
                      AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 WHERE pa2.employee_id = e.employee_id AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)), 0) <= 0
                    GROUP BY e.employee_name,e.date_of_joining
                    HAVING CURRENT_DATE-COALESCE(MAX(pa.allocation_end_date) FILTER (WHERE pa.allocation_end_date <= CURRENT_DATE), e.date_of_joining, CURRENT_DATE)>30 LIMIT 3)
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
                manual_todos = [{"id": r[0],"message":r[1],"type":r[2],"status":r[3],
                    "time": r[4].strftime("%I:%M %p") if r[4] else "Just now","isSystemSuggestion":False}
                    for r in cur.fetchall()]
            except Exception:
                manual_todos = []

            system_suggestions = [{"id": f"sys-{item['id']}","message": f"{item['title']}: {item['detail']}",
                "type":"critical" if item['priority']=='High' else "warning","status":"pending","time":"System",
                "isSystemSuggestion":True,"actionType":item.get('actionType')}
                for item in dynamic_todos if item.get('id') != "risk-0"]

            todos = system_suggestions + manual_todos
            risk_insights = dynamic_todos

        except Exception as e:
            print("Error in Todos Batch:", e)
            risk_insights = []; todos = []

        print("API: Dashboard fetch COMPLETE.")
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

@router.get("/dashboard/infocards")
def infocards():
    """Fallback individual endpoint for infocards."""
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL")
        total_employees = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM clients")
        total_clients = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM projects")
        running_projects = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
            AND m.date_of_resign IS NULL AND COALESCE(p.employee_allocations, 0) <= 0
        """)
        bench_employees = cur.fetchone()[0]
        return {
            "total_employees": total_employees,
            "total_clients": total_clients,
            "running_projects": running_projects,
            "bench_employees": bench_employees
        }

@router.get("/dashboard/skills-gap")
def skills_gap():
    with db_cursor() as cur:
        cur.execute("""
            SELECT s.skill_name, COUNT(DISTINCT es.employee_id), COUNT(DISTINCT ps.project_id)
            FROM skills s
            LEFT JOIN employee_skills es ON s.skill_id = es.skill_id
            LEFT JOIN project_skills ps ON s.skill_id = ps.skill_id
            GROUP BY s.skill_name
        """)
        rows = cur.fetchall()
        result = []
        for r in rows:
            availability, allocated = r[1] or 0, r[2] or 0
            gap = "high" if allocated > availability else "medium" if allocated == availability else "low"
            result.append({"skill": r[0], "availability": availability, "allocated": allocated, "gap": gap})
        return result

@router.get("/dashboard/executive-metrics")
def dashboard_executive_metrics():
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM employee_master m WHERE date_of_resign IS NULL")
        total_emp = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM employee_master_pro WHERE employee_status ILIKE CHR(37)||'notice'||CHR(37)")
        notice_p = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id=m.employee_id
            WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
            AND LOWER(pa.project_tags)='billable' AND m.date_of_resign IS NULL
        """)
        billable_hc = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
            WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status IS NULL)
            AND m.date_of_resign IS NULL AND COALESCE(p.employee_allocations,0)<=0
        """)
        bench_hc = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id=m.employee_id
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND m.date_of_resign IS NULL
        """)
        upcoming_bench = cur.fetchone()[0]
        active_hc = max(1, total_emp - notice_p)

        cur.execute("""
            WITH months AS (
                SELECT generate_series(DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 months', INTERVAL '1 month') AS month_start
            )
            SELECT TO_CHAR(mo.month_start, 'Mon'), COALESCE(SUM(pa.allocation_percentage)/100.0, 0)
            FROM months mo
            LEFT JOIN projects_allocation pa ON pa.allocation_start_date<=(mo.month_start+INTERVAL '1 month'-INTERVAL '1 day') AND (pa.allocation_end_date>=mo.month_start OR pa.allocation_end_date IS NULL)
            GROUP BY mo.month_start ORDER BY mo.month_start
        """)
        forecast = [{"month": r[0], "allocated": round(float(r[1]), 2), "availability": round(max(float(active_hc)-float(r[1]), 0), 2)} for r in cur.fetchall()]

        return {"total_employees": total_emp, "billable_headcount": billable_hc, "bench_headcount": bench_hc, "notice_period": notice_p, "upcoming_bench": upcoming_bench, "forecast": forecast}

@router.get("/dashboard/todos")
def get_todos():
    with db_cursor() as cur:
        cur.execute("SELECT id, message, type, status, created_at FROM actionable_todos ORDER BY created_at DESC")
        return [{"id": r[0], "message": r[1], "type": r[2], "status": r[3], "time": r[4].strftime("%I:%M %p") if r[4] else "Just now"} for r in cur.fetchall()]

@router.post("/dashboard/todos")
def add_todo(todo: TodoItem):
    with db_cursor() as cur:
        cur.execute("INSERT INTO actionable_todos (message, type, status) VALUES (%s, %s, 'pending') RETURNING id, message, type, status, created_at", (todo.message, todo.type))
        r = cur.fetchone()
        return {"id": r[0], "message": r[1], "type": r[2], "status": r[3], "time": r[4].strftime("%I:%M %p") if r[4] else "Just now"}

@router.put("/dashboard/todos/{todo_id}/toggle")
def toggle_todo(todo_id: int):
    with db_cursor() as cur:
        cur.execute("SELECT status FROM actionable_todos WHERE id = %s", (todo_id,))
        row = cur.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Todo not found")
        new_status = 'completed' if row[0] == 'pending' else 'pending'
        cur.execute("UPDATE actionable_todos SET status = %s WHERE id = %s RETURNING status", (new_status, todo_id))
        return {"id": todo_id, "status": cur.fetchone()[0]}

@router.delete("/dashboard/todos/{todo_id}")
def delete_todo(todo_id: int):
    with db_cursor() as cur:
        cur.execute("DELETE FROM actionable_todos WHERE id = %s", (todo_id,))
        return {"detail": "Todo deleted successfully"}

@router.get("/dashboard/export-risk-board")
def export_risk_board():
    with db_cursor() as cur:
        cur.execute("SELECT p.project_name, count(pa.employee_id) as res_count FROM projects p LEFT JOIN projects_allocation pa ON pa.project_id = p.project_id GROUP BY p.project_name ORDER BY res_count ASC")
        rows = cur.fetchall()
        data = [[r[0], "Internal", "High" if r[1]==0 else "Medium" if r[1]<3 else "Low", f"Res count: {r[1]}", r[1], 100 if r[1]>=3 else 55 if r[1]>0 else 20] for r in rows]
        output = io.StringIO(); writer = csv.writer(output); writer.writerow(["Project Name", "Client", "Delivery Risk", "Risk Reason", "Resource Count", "Health %"]); writer.writerows(data); output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=delivery_risk_board.csv"})
