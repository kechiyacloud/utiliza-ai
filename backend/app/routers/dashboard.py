from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from app.database import get_db_connection, release_db_connection, db_cursor
from pydantic import BaseModel
import io
import csv
import traceback
from datetime import datetime
from app.auth_utils import get_current_user

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
        # Check if lookup table exists and has data
        cur.execute("SELECT COUNT(*) FROM departments")
        if cur.fetchone()[0] > 0:
            cur.execute("SELECT department_name FROM departments ORDER BY department_name")
        else:
            # Fallback to existing employees if lookup is empty
            cur.execute("SELECT DISTINCT department FROM employee_master WHERE department IS NOT NULL AND department != '' ORDER BY department")
        depts = [r[0] for r in cur.fetchall()]
        return depts

@router.get("/dashboard/designations")
async def get_designations():
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM designations")
        if cur.fetchone()[0] > 0:
            cur.execute("SELECT designation_name FROM designations ORDER BY designation_name")
        else:
            cur.execute("SELECT DISTINCT role_designation FROM employee_master WHERE role_designation IS NOT NULL AND role_designation != '' ORDER BY role_designation")
        
        roles = [r[0] for r in cur.fetchall()]
        
        # Normalize and unify CSE / Cloud Solution Engineer
        unified = set()
        for r in roles:
            norm = r.strip()
            if norm.upper() == 'CSE':
                unified.add('Cloud Solution Engineer')
            else:
                unified.add(norm)
        
        return sorted(list(unified))

@router.get("/dashboard/all")
def get_dashboard_all(
    department: Optional[str] = None,
    designations: Optional[str] = None,
    locations: Optional[str] = None,
    employment_types: Optional[str] = None,
    skills: Optional[str] = None,
    status: Optional[str] = None,
    _user: dict = Depends(get_current_user)
):
    """Consolidated endpoint to fetch all dashboard data in a single request."""
    with db_cursor() as cur:
        # Construct filter lists
        dept_list = [d.strip() for d in department.split(',')] if department and department != 'Overall' else []
        desig_list = [d.strip() for d in designations.split(',')] if designations else []
        loc_list = [d.strip() for d in locations.split(',')] if locations else []
        type_list = [d.strip() for d in employment_types.split(',')] if employment_types else []
        skill_list = [f"%{s.strip()}%" for s in skills.split(',')] if skills else []
        status_list = [s.strip().lower() for s in status.split(',')] if status else []
        
        # Unify Designation Filter (CSE / Cloud Solution Engineer)
        expanded_desig = set(desig_list)
        if 'Cloud Solution Engineer' in expanded_desig:
            expanded_desig.add('CSE')
        if 'CSE' in expanded_desig:
            expanded_desig.add('Cloud Solution Engineer')
        desig_list = list(expanded_desig)
        
        # Unified filtering parameters
        named_params = {
            'dept': dept_list,
            'desig': desig_list,
            'loc': loc_list,
            'type': type_list,
            'skills': [f"%{s}%" for s in skill_list]
        }
        
        # Base filters: only show active, non-deleted employees
        m_base = " AND (m.date_of_resign IS NULL OR m.date_of_resign > CURRENT_DATE) AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL) "
        e_base = " AND (e.date_of_resign IS NULL OR e.date_of_resign > CURRENT_DATE) AND (e.is_deleted IS FALSE OR e.is_deleted IS NULL) "

        m_filter = m_base
        e_filter = e_base

        if department and department != 'All Departments':
            m_filter += " AND m.department = ANY(%(dept)s) "
            e_filter += " AND e.department = ANY(%(dept)s) "
        
        if desig_list:
            m_filter += " AND m.role_designation = ANY(%(desig)s) "
            e_filter += " AND e.role_designation = ANY(%(desig)s) "
            
        if loc_list:
            m_filter += " AND m.location = ANY(%(loc)s) "
            e_filter += " AND e.location = ANY(%(loc)s) "
            
        if type_list:
            m_filter += " AND m.employee_type = ANY(%(type)s) "
            e_filter += " AND e.employee_type = ANY(%(type)s) "
            
        if skill_list:
            # skills in employee_master is often a text array or comma-sep
            m_filter += " AND EXISTS (SELECT 1 FROM UNNEST(m.skills) s WHERE s ILIKE ANY(%(skills)s)) "
            e_filter += " AND EXISTS (SELECT 1 FROM UNNEST(e.skills) s WHERE s ILIKE ANY(%(skills)s)) "

        # Forecast needs to allow NULL employee_id rows to show empty months
        e_filter_with_null = e_filter.replace("e.department", "(e.department")
        if "ANY(%(dept)s)" in e_filter_with_null:
             e_filter_with_null = e_filter_with_null.replace("ANY(%(dept)s)", "ANY(%(dept)s) OR pa.employee_id IS NULL)")
        else:
             e_filter_with_null = e_filter # Fallback

        if status_list:
            status_clauses = []
            if 'bench' in status_list:
                status_clauses.append("COALESCE((SELECT SUM(allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id), 0) <= 0")
            if 'allocated' in status_list:
                status_clauses.append("COALESCE((SELECT SUM(allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id), 0) >= 100")
            if 'partially allocated' in status_list:
                status_clauses.append("COALESCE((SELECT SUM(allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id), 0) BETWEEN 1 AND 99")
            
            if status_clauses:
                m_filter += " AND (" + " OR ".join(status_clauses) + ") "
                e_status_clauses = [c.replace("m.employee_id", "e.employee_id") for c in status_clauses]
                e_filter += " AND (" + " OR ".join(e_status_clauses) + ") "

        e_filter_with_null = ""
        if e_filter.strip():
            # For the Forecast query, we need to allow pa.employee_id IS NULL to show months with no allocations
            e_filter_with_null = " AND ((" + e_filter.strip()[4:] + ") OR pa.employee_id IS NULL) "
            
        # Standardize params for all queries
        dept_params = named_params

        # ==============================================================
        # BATCH 1: Core Metrics (Total, Notice, Billable, Bench, Joiners)
        # ==============================================================
        print(" -> Batch 1: Core Metrics")
        try:
            # Fetch all core headcounts in one go using named params
            cur.execute(f"""
                SELECT
                    (SELECT COUNT(*) FROM employee_master m WHERE 1=1 {m_filter}),
                    (SELECT COUNT(*) FROM employee_master m JOIN employee_master_pro p ON m.employee_id=p.employee_id
                     WHERE (p.employee_status ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status ILIKE CHR(37)||'pip'||CHR(37)) {m_filter}),
                    (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                     JOIN projects pj ON pa.project_id = pj.project_id
                     JOIN employee_master m ON pa.employee_id=m.employee_id
                     LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                     WHERE pa.allocation_start_date <= CURRENT_DATE
                       AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                       AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                       AND (LOWER(pa.project_tags)='billable' OR LOWER(pa.project_tags)='yes' OR LOWER(pa.project_tags)='y') 
                       AND (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) AND p.employee_status NOT ILIKE CHR(37)||'pip'||CHR(37) OR p.employee_status IS NULL)
                       {m_filter} AND pa.allocation_percentage > 0),
                    (SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
                     LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                     WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) AND p.employee_status NOT ILIKE CHR(37)||'pip'||CHR(37) OR p.employee_status IS NULL)
                       {m_filter}
                       AND COALESCE((
                           SELECT SUM(pa_sub.allocation_percentage) 
                           FROM projects_allocation pa_sub 
                           JOIN projects pj_sub ON pa_sub.project_id = pj_sub.project_id
                           WHERE pa_sub.employee_id = m.employee_id 
                             AND pa_sub.allocation_start_date <= CURRENT_DATE
                             AND (pa_sub.allocation_end_date IS NULL OR pa_sub.allocation_end_date >= CURRENT_DATE)
                             AND COALESCE(LOWER(pj_sub.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                       ), 0) <= 0),
                    (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                     JOIN projects pj ON pa.project_id = pj.project_id
                     JOIN employee_master m ON pa.employee_id=m.employee_id
                     LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
                     WHERE pa.allocation_start_date <= CURRENT_DATE
                       AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
                       AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                       AND (LOWER(pa.project_tags) LIKE '%%non%%' OR LOWER(pa.project_tags)='no') 
                       AND (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) AND p.employee_status NOT ILIKE CHR(37)||'pip'||CHR(37) OR p.employee_status IS NULL)
                       {m_filter} AND pa.allocation_percentage > 0),
                    (SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
                     LEFT JOIN projects pj ON pa.project_id = pj.project_id
                     JOIN employee_master m ON pa.employee_id=m.employee_id
                     WHERE pa.allocation_start_date <= CURRENT_DATE
                       AND pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE+INTERVAL '30 days')
                       AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                       AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
                       AND m.date_of_resign IS NULL
                       AND NOT EXISTS (
                           SELECT 1 FROM projects_allocation pa2
                           LEFT JOIN projects pj2 ON pa2.project_id = pj2.project_id
                           WHERE pa2.employee_id = pa.employee_id
                             AND pa2.allocation_id <> pa.allocation_id
                             AND (pa2.allocation_end_date > pa.allocation_end_date OR pa2.allocation_end_date IS NULL)
                             AND COALESCE(LOWER(pj2.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                             AND pa2.allocation_start_date <= CURRENT_DATE
                       )
                       {m_filter}
                    ),
                    (SELECT COUNT(*) FROM employee_master m 
                     WHERE m.date_of_joining >= CURRENT_DATE - INTERVAL '30 days'
                     {m_filter})
            """, dept_params)
            core_row = cur.fetchone()
            total_emp, notice_p, billable_hc, bench_hc, non_billable_hc, upcoming_bench, new_join_hc = core_row
            
            infocards = {
                "totalEmployees": {"value": total_emp, "label": "Total Employees", "change": "+0% this month"},
                "activeClients": {"value": (SELECT_COUNT_CLIENTS := 0), "label": "Active Clients", "change": "Stable"}, # Placeholder for next fetch
                "runningProjects": {"value": 0, "label": "Running Projects", "change": "Active now"},
                "benchEmployees": {"value": bench_hc, "label": "Employees on Bench", "change": "Available"},
                "newJoiners": {"value": new_join_hc, "label": "New Joiners", "change": "Last 30 days"}
            }
            
            cur.execute("SELECT (SELECT COUNT(*) FROM clients), (SELECT COUNT(*) FROM projects)")
            client_proj = cur.fetchone()
            infocards["activeClients"]["value"] = client_proj[0]
            infocards["runningProjects"]["value"] = client_proj[1]

        except Exception as e:
            print("Error in Core Metrics:")
            traceback.print_exc()
            cur.connection.rollback()
            total_emp, notice_p, billable_hc, bench_hc, non_billable_hc, upcoming_bench, new_join_hc = 0,0,0,0,0,0,0
            infocards = {}

        # ==============================================================
        # BATCH 2: Forecast (Calculated ONCE for all modules)
        # ==============================================================
        print(" -> Batch 2: Forecast Sync")
        try:
            cur.execute(f"""
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE),
                        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 months',
                        INTERVAL '1 month'
                    ) AS month_start
                )
                SELECT TO_CHAR(mo.month_start, 'Mon'),
                    COUNT(DISTINCT pa.employee_id)
                FROM months mo
                LEFT JOIN projects_allocation pa
                  ON pa.allocation_start_date <= (CASE WHEN DATE_TRUNC('month', mo.month_start) = DATE_TRUNC('month', CURRENT_DATE) THEN CURRENT_DATE ELSE (mo.month_start + INTERVAL '1 month' - INTERVAL '1 day') END)
                 AND (pa.allocation_end_date >= (CASE WHEN DATE_TRUNC('month', mo.month_start) = DATE_TRUNC('month', CURRENT_DATE) THEN CURRENT_DATE ELSE mo.month_start END) OR pa.allocation_end_date IS NULL)
                LEFT JOIN projects pj ON pa.project_id = pj.project_id
                LEFT JOIN employee_master e ON pa.employee_id = e.employee_id
                WHERE (e.is_deleted IS FALSE OR e.is_deleted IS NULL OR pa.employee_id IS NULL)
                  AND (e.date_of_resign IS NULL OR e.date_of_resign > CURRENT_DATE OR pa.employee_id IS NULL)
                  AND (pa.allocation_id IS NULL OR (pa.allocation_percentage > 0 AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')))
                {e_filter_with_null}
                GROUP BY mo.month_start ORDER BY mo.month_start
            """, dept_params)
            
            forecast = []
            for r in cur.fetchall():
                allocate_count = int(r[1])
                ratio = round((allocate_count / max(1, total_emp)) * 100, 1)
                forecast.append({
                    "month": r[0], 
                    "allocate": allocate_count, 
                    "allocations": allocate_count,
                    "available": max(total_emp - allocate_count, 0),
                    "ratio": ratio
                })
            allocation_3m = forecast # Shared with high-level allocation card
        except Exception as e:
            print("Error in Forecast Sync:")
            traceback.print_exc()
            cur.connection.rollback()
            forecast = []; allocation_3m = []

        # ==============================================================
        # BATCH 3: Lists & Risks
        # ==============================================================
        try:
            # High Allocation
            cur.execute(f"""
                SELECT p.project_name, COUNT(pa.employee_id) AS resource_count
                FROM projects p
                JOIN projects_allocation pa ON p.project_id = pa.project_id
                JOIN employee_master e ON pa.employee_id = e.employee_id
                WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
                  AND COALESCE(LOWER(p.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                  {e_filter}
                GROUP BY p.project_name ORDER BY resource_count DESC LIMIT 5
            """, dept_params)
            high_allocation = [{"project_name": r[0], "resource_count": r[1]} for r in cur.fetchall()]

            # Top Performers
            cur.execute(f"""
                SELECT e.employee_id, e.employee_name, e.role_designation, COALESCE(p.employee_allocations,0)
                FROM employee_master e
                LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
                WHERE (e.date_of_resign IS NULL OR e.date_of_resign > CURRENT_DATE)
                  AND (e.is_deleted IS FALSE OR e.is_deleted IS NULL)
                  {e_filter}
                ORDER BY p.employee_allocations DESC NULLS LAST LIMIT 5
            """, dept_params)
            top_performers = [{"employee_id": r[0],"name": r[1],"role": r[2].replace('CSE','Cloud Solution Engineer') if r[2] else 'Resource',"allocation": r[3]} for r in cur.fetchall()]

            # Upcoming Availability
            cur.execute(f"""
                SELECT e.employee_name, COALESCE(p.project_name, 'Internal'), pa.allocation_end_date, pa.allocation_percentage
                FROM projects_allocation pa
                JOIN employee_master e ON pa.employee_id = e.employee_id
                LEFT JOIN projects p ON pa.project_id = p.project_id
                WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                  AND pa.allocation_start_date <= CURRENT_DATE
                  AND (e.is_deleted IS FALSE OR e.is_deleted IS NULL)
                  AND e.date_of_resign IS NULL
                  AND COALESCE(LOWER(p.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
                  {e_filter}
                ORDER BY pa.allocation_end_date ASC LIMIT 10
            """, dept_params)
            availability = [{"name": r[0], "project": r[1], "releaseDate": r[2].isoformat() if r[2] else None, "allocation": r[3]} for r in cur.fetchall()]

        except Exception as e:
            print("Error in Batch 3 Lists:")
            cur.connection.rollback()
            high_allocation=[]; top_performers=[]; availability=[]

        # ==============================================================
        # BATCH 4: Transitions & Skills
        # ==============================================================
        try:
            # Transitions (Resilient tracking for last 90 days)
            cur.execute(f"""
                SELECT 
                    e.employee_name,
                    (SELECT COALESCE(prev_p.project_name, 'Bench') 
                     FROM projects_allocation pa_prev 
                     LEFT JOIN projects prev_p ON pa_prev.project_id = prev_p.project_id
                     WHERE pa_prev.employee_id = pa.employee_id 
                       AND pa_prev.allocation_start_date < pa.allocation_start_date
                     ORDER BY pa_prev.allocation_start_date DESC LIMIT 1) as from_project,
                    COALESCE(p.project_name, 'Bench') as to_project,
                    pa.allocation_start_date,
                    e.role_designation
                FROM projects_allocation pa
                JOIN employee_master e ON e.employee_id = pa.employee_id
                LEFT JOIN projects p ON p.project_id = pa.project_id
                WHERE pa.allocation_start_date >= CURRENT_DATE - INTERVAL '90 days'
                  AND pa.allocation_start_date < CURRENT_DATE
                  AND (e.is_deleted IS FALSE OR e.is_deleted IS NULL)
                  {e_filter}
                ORDER BY pa.allocation_start_date DESC LIMIT 10
            """, dept_params)
            transitions = [{"employee": r[0], "from_project": r[1], "to_project": r[2], "date": r[3], "role": r[4]} for r in cur.fetchall()]

            # Skills Gap (Optimized)
            cur.execute(f"""
                SELECT s.skill_name, COUNT(DISTINCT es.employee_id) as avail, COUNT(DISTINCT ps.project_id) as req
                FROM skills s
                LEFT JOIN employee_skills es ON s.skill_id = es.skill_id
                LEFT JOIN employee_master m ON es.employee_id = m.employee_id
                LEFT JOIN project_skills ps ON s.skill_id = ps.skill_id
                WHERE 1=1 {m_filter}
                GROUP BY s.skill_name ORDER BY req DESC LIMIT 10
            """, dept_params)
            skills_gap = [{"skill": r[0], "availability": r[1], "allocated": r[2], "gap": "high" if r[2]>r[1] else "low"} for r in cur.fetchall()]

        except Exception as e:
            print("Error in Batch 4 Skills:")
            cur.connection.rollback()
            transitions=[]; skills_gap=[]

        # ==============================================================
        # BATCH 5: Executive Summary & Bench Analysis
        # ==============================================================
        try:
            # Certifications
            cur.execute(f"""
                SELECT e.employee_name, c.certificate_name, ec.expiry_date
                FROM employee_certificates ec
                JOIN employee_master e ON ec.employee_id = e.employee_id
                JOIN certificates c ON ec.certificate_id = c.certificate_id
                WHERE (e.is_deleted IS FALSE OR e.is_deleted IS NULL)
                  AND (e.date_of_resign IS NULL OR e.date_of_resign > CURRENT_DATE)
                  {e_filter}
                ORDER BY ec.expiry_date ASC LIMIT 10
            """, dept_params)
            certifications = [{"employee": r[0], "certificate_name": r[1], "expiry_date": r[2]} for r in cur.fetchall()]

            # Bench Aging
            cur.execute(f"""
                WITH BenchStats AS (
                    SELECT 
                        e.employee_name, 
                        e.role_designation,
                        CURRENT_DATE - COALESCE(MAX(pa.allocation_end_date) FILTER (WHERE pa.allocation_end_date <= CURRENT_DATE), e.date_of_joining, CURRENT_DATE) as total_days
                    FROM employee_master e
                    LEFT JOIN employee_master_pro p ON e.employee_id = p.employee_id
                    LEFT JOIN projects_allocation pa ON e.employee_id = pa.employee_id
                    WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
                      AND e.date_of_resign IS NULL AND (e.is_deleted IS FALSE OR e.is_deleted IS NULL)
                      AND COALESCE((SELECT SUM(pa2.allocation_percentage) FROM projects_allocation pa2 WHERE pa2.employee_id = e.employee_id AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)), 0) <= 0
                    {e_filter}
                    GROUP BY e.employee_name, e.role_designation, e.date_of_joining
                )
                SELECT employee_name, role_designation, total_days, LEAST(total_days, 365) as days_in_year
                FROM BenchStats ORDER BY total_days DESC LIMIT 5
            """, dept_params)
            bench_aging = [{"name": r[0], "designation": r[1], "bench_days": int(r[2]), "days_in_year": int(r[3])} for r in cur.fetchall()]

            # Bench Skills
            cur.execute(f"""
                SELECT s.skill_name, count(es.employee_id) as c
                FROM employee_skills es
                JOIN skills s ON s.skill_id = es.skill_id
                JOIN employee_master m ON es.employee_id = m.employee_id
                LEFT JOIN employee_master_pro emp ON emp.employee_id = m.employee_id
                WHERE (emp.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) OR emp.employee_status IS NULL)
                  AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
                  AND COALESCE((SELECT SUM(pa.allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)), 0) <= 0
                  {m_filter}
                GROUP BY s.skill_name ORDER BY c DESC LIMIT 5
            """, dept_params)
            bench_skills = [{"name": r[0], "count": r[1]} for r in cur.fetchall()]

            # Utilization trends (6-month historical)
            cur.execute(f"""
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
                       AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
                       {m_filter}
                    ), 0) as billable_count
                FROM months mo ORDER BY mo.month_start
            """, dept_params)
            utilization_trends = [{"month": r[0], "value": float(r[1])} for r in cur.fetchall()]

            utilization = int((billable_hc * 100) / max(1, total_emp))
            executive = {
                "companyUtilization": utilization,
                "billableHeadcount": billable_hc,
                "benchHeadcount": bench_hc,
                "noticePeriod": notice_p,
                "internalHeadcount": non_billable_hc,
                "totalEmployees": total_emp,
                "newJoiners": new_join_hc,
                "upcomingBench": upcoming_bench,
                "forecast": forecast,
                "benchAging": bench_aging,
                "benchSkills": bench_skills,
                "utilizationPrediction": {"tip": "Target 85% utilization.", "target": 85, "gap": max(0, 85 - utilization)},
                "utilizationTrends": utilization_trends
            }
        except Exception as e:
            print("Error in Batch 5 Analysis:", e)
            certifications = []; bench_aging = []; bench_skills = []; executive = {}

        # ==============================================================
        # BATCH 6: Actionable Todos
        # ==============================================================
        try:
            actionable_todos_list = []
            if upcoming_bench > 0:
                actionable_todos_list.append({"id":"alert-1", "priority":"High", "color":"amber", "icon":"Clock", "title": f"Upcoming Roll-offs ({upcoming_bench})", "detail":"Prepare redeployment for resources ending soon.", "actionType":"allocation"})
            if bench_hc > 5:
                actionable_todos_list.append({"id":"alert-2", "priority":"High", "color":"rose", "icon":"AlertCircle", "title": f"Bench Alert ({bench_hc})", "detail":"High bench headcount. Optimize project intake.", "actionType":"allocation"})
            
            todos = [{"id": a["id"], "message": f"{a['title']}: {a['detail']}", "type":"warning", "status":"pending", "time":"System", "isSystemSuggestion":True} for a in actionable_todos_list]
        except Exception:
            actionable_todos_list = []; todos = []

        return {
            "infocards": infocards,
            "resourceForecast": allocation_3m,
            "highAllocationProjects": high_allocation,
            "topPerformers": top_performers,
            "resourceAvailability": availability,
            "recentTransitions": transitions,
            "certificationExpiry": certifications,
            "skillsGap": skills_gap,
            "executiveMetrics": executive,
            "actionableTodos": actionable_todos_list,
            "todos": todos
        }

@router.get("/dashboard/infocards")
def infocards():
    """Fallback individual endpoint for infocards."""
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL AND (is_deleted IS FALSE OR is_deleted IS NULL)")
        total_employees = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM clients")
        total_clients = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM projects")
        running_projects = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
            AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL) AND COALESCE(p.employee_allocations, 0) <= 0
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
        cur.execute("SELECT COUNT(*) FROM employee_master m WHERE date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)")
        total_emp = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM employee_master_pro p JOIN employee_master m ON p.employee_id=m.employee_id WHERE (p.employee_status ILIKE CHR(37)||'notice'||CHR(37) OR p.employee_status ILIKE CHR(37)||'pip'||CHR(37)) AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)")
        notice_p = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id=m.employee_id
            WHERE (pa.allocation_end_date IS NULL OR pa.allocation_end_date>=CURRENT_DATE)
            AND LOWER(pa.project_tags)='billable' AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
        """)
        billable_hc = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id) FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id=p.employee_id
            WHERE (p.employee_status NOT ILIKE CHR(37)||'notice'||CHR(37) AND p.employee_status NOT ILIKE CHR(37)||'pip'||CHR(37) OR p.employee_status IS NULL)
            AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL) AND COALESCE(p.employee_allocations,0)<=0
        """)
        bench_hc = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(DISTINCT pa.employee_id) FROM projects_allocation pa
            JOIN employee_master m ON pa.employee_id=m.employee_id
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
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
