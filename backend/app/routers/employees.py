from fastapi import APIRouter, HTTPException, Query
from app.database import get_db_connection, release_db_connection, db_cursor
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import uuid


def _ensure_employee_columns(cur):
    """Ensures all necessary columns exist in employee_master and employee_master_pro."""
    cur.execute("""
        DO $$ 
        BEGIN 
            -- employee_master column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='employee_master' AND column_name='is_deleted') THEN
                ALTER TABLE employee_master ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
            END IF;

            -- employee_master_pro columns
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='employee_master_pro' AND column_name='pip_start_date') THEN
                ALTER TABLE employee_master_pro ADD COLUMN pip_start_date DATE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='employee_master_pro' AND column_name='pip_end_date') THEN
                ALTER TABLE employee_master_pro ADD COLUMN pip_end_date DATE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='employee_master_pro' AND column_name='notice_start_date') THEN
                ALTER TABLE employee_master_pro ADD COLUMN notice_start_date DATE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='employee_master_pro' AND column_name='notice_end_date') THEN
                ALTER TABLE employee_master_pro ADD COLUMN notice_end_date DATE;
            END IF;
        END $$;
    """)


def _table_has_column(cur, table_name: str, column_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
        )
        """,
        (table_name, column_name),
    )
    return bool(cur.fetchone()[0])


def _sync_employee_allocations(cur, employee_ids):
    """Re-compute employee_allocations in employee_master_pro from live projects_allocation rows.
    Also auto-transitions notice period employees to Resigned when their notice_end_date has passed."""
    if not employee_ids:
        return

    # Auto-transition: notice period ended → set status to Resigned and write date_of_resign
    cur.execute("""
        UPDATE employee_master_pro
        SET employee_status = 'Resigned'
        WHERE employee_id = ANY(%s)
          AND employee_status ILIKE '%%notice%%'
          AND notice_end_date IS NOT NULL
          AND notice_end_date < CURRENT_DATE
    """, (list(employee_ids),))

    cur.execute("""
        UPDATE employee_master m
        SET date_of_resign = p.notice_end_date
        FROM employee_master_pro p
        WHERE m.employee_id = p.employee_id
          AND m.employee_id = ANY(%s)
          AND p.employee_status = 'Resigned'
          AND p.notice_end_date IS NOT NULL
          AND m.date_of_resign IS NULL
    """, (list(employee_ids),))

    cur.execute("""
        UPDATE employee_master_pro p
        SET employee_allocations = COALESCE((
            SELECT SUM(pa.allocation_percentage)
            FROM projects_allocation pa
            JOIN projects pj ON pa.project_id = pj.project_id
            WHERE pa.employee_id = p.employee_id
              AND pa.allocation_start_date <= CURRENT_DATE
              AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
              AND LOWER(pj.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
        ), 0),
        employee_status = CASE
            WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status
            WHEN p.employee_status ILIKE '%%pip%%'    THEN p.employee_status
            WHEN p.employee_status ILIKE '%%resign%%' THEN p.employee_status
            WHEN COALESCE((
                SELECT SUM(pa2.allocation_percentage)
                FROM projects_allocation pa2
                JOIN projects pj2 ON pa2.project_id = pj2.project_id
                WHERE pa2.employee_id = p.employee_id
                  AND pa2.allocation_start_date <= CURRENT_DATE
                  AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)
                  AND LOWER(pj2.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
            ), 0) <= 0 THEN 'Bench'
            WHEN COALESCE((
                SELECT SUM(pa3.allocation_percentage)
                FROM projects_allocation pa3
                JOIN projects pj3 ON pa3.project_id = pj3.project_id
                WHERE pa3.employee_id = p.employee_id
                  AND pa3.allocation_start_date <= CURRENT_DATE
                  AND (pa3.allocation_end_date IS NULL OR pa3.allocation_end_date >= CURRENT_DATE)
                  AND LOWER(pj3.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
            ), 0) BETWEEN 1 AND 40 THEN 'Partially bench'
            WHEN COALESCE((
                SELECT SUM(pa4.allocation_percentage)
                FROM projects_allocation pa4
                JOIN projects pj4 ON pa4.project_id = pj4.project_id
                WHERE pa4.employee_id = p.employee_id
                  AND pa4.allocation_start_date <= CURRENT_DATE
                  AND (pa4.allocation_end_date IS NULL OR pa4.allocation_end_date >= CURRENT_DATE)
                  AND LOWER(pj4.project_status) NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
            ), 0) BETWEEN 41 AND 80 THEN 'Partially allocated'
            ELSE 'Allocated'
        END
        WHERE p.employee_id = ANY(%s)
    """, (list(employee_ids),))


class ProjectAllocationInput(BaseModel):
    project_id: str
    project_role: str
    project_allocation: int
    project_start_date: date
    project_end_date: Optional[date] = None

class CertificateInput(BaseModel):
    name: str

class EmployeeCreateUpdate(BaseModel):
    employee_id: str
    employee_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    date_of_joining: date
    role_designation: str
    department: str
    employment_type: str
    location: str
    work_mode: str
    employee_status: str
    employee_allocations: int
    reporting_manager_id: str
    date_of_resign: Optional[date] = None
    pip_start_date: Optional[date] = None
    pip_end_date: Optional[date] = None
    notice_start_date: Optional[date] = None
    notice_end_date: Optional[date] = None
    skills: List[str] = []
    projects: List[ProjectAllocationInput] = []
    certificates: List[CertificateInput] = []
    shift: Optional[str] = None

class NominationInput(BaseModel):
    employee_id: str
    nominator_role: str
    feedback_text: str
    month: str

router = APIRouter()

@router.get("/employees/count")
def get_total_employee_count():
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM employee_master WHERE (date_of_resign IS NULL OR date_of_resign > CURRENT_DATE) AND (is_deleted IS FALSE OR is_deleted IS NULL)")
        result = cur.fetchone()
        return {"total_employees": result[0]}

@router.get("/employees/bench/count")
def get_bench_employee_count():
    with db_cursor() as cur:
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id)
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE (p.employee_status NOT ILIKE CHR(37) || 'notice' || CHR(37) OR p.employee_status IS NULL)
            AND (m.date_of_resign IS NULL OR m.date_of_resign > CURRENT_DATE) 
            AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
            AND COALESCE((SELECT SUM(pa.allocation_percentage) FROM projects_allocation pa WHERE pa.employee_id = m.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)), 0) <= 0
        """)
        result = cur.fetchone()
        return {"bench_employees": result[0]}

@router.get("/employees/notice/count")
def get_notice_employee_count():
    with db_cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM employee_master m
            JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
              AND (p.employee_status ILIKE '%%notice%%' OR p.employee_status ILIKE '%%pip%%')
        """)
        result = cur.fetchone()
        return {"notice_employees": result[0]}

@router.get("/employees/roles")
def get_employee_roles():
    with db_cursor() as cur:
        cur.execute("SELECT DISTINCT role_designation FROM employee_master ORDER BY role_designation")
        roles = [row[0] for row in cur.fetchall()]
        
        # Unify CSE / Cloud Solution Engineer
        unified = set()
        for r in roles:
            norm = r.strip()
            if norm.upper() == 'CSE':
                unified.add('Cloud Solution Engineer')
            else:
                unified.add(norm)
        
        return {"roles": sorted(list(unified))}

@router.post("/employees/sync-all")
def sync_all_employees():
    """Forces a global synchronization of all active employee allocations and statuses."""
    with db_cursor() as cur:
        _ensure_employee_columns(cur)
        cur.execute("SELECT employee_id FROM employee_master WHERE date_of_resign IS NULL AND (is_deleted IS FALSE OR is_deleted IS NULL)")
        ids = [row[0] for row in cur.fetchall()]
        if ids:
            _sync_employee_allocations(cur, ids)
        return {"status": "success", "synced_count": len(ids)}

@router.get("/employees/list")
def get_all_employees(include_resigned: bool = False, include_deleted: bool = False):
    print("API: Fetching all employees...")
    with db_cursor() as cur:
        # Optimization: Perform schema checks once in a consolidated query
        cur.execute("""
            SELECT 
                column_name, table_name
            FROM information_schema.columns 
            WHERE (table_name = 'employee_master' AND column_name IN ('employee_type', 'is_deleted'))
               OR (table_name = 'employee_master_pro' AND column_name IN ('pip_start_date', 'pip_end_date', 'notice_start_date', 'notice_end_date'))
        """)
        cols_present = {(r[0], r[1]) for r in cur.fetchall()}
        
        has_employee_type = ("employee_type", "employee_master") in cols_present
        has_is_deleted = ("is_deleted", "employee_master") in cols_present
        has_pip_start_date = ("pip_start_date", "employee_master_pro") in cols_present
        has_pip_end_date = ("pip_end_date", "employee_master_pro") in cols_present
        has_notice_start_date = ("notice_start_date", "employee_master_pro") in cols_present
        has_notice_end_date = ("notice_end_date", "employee_master_pro") in cols_present

        employee_type_expr = "m.employee_type" if has_employee_type else "'Full Time'"
        is_deleted_expr = "(m.is_deleted = FALSE OR m.is_deleted IS NULL OR %s = TRUE)" if has_is_deleted else "(TRUE OR %s = TRUE)"
        pip_start_expr = "p.pip_start_date" if has_pip_start_date else "NULL::date"
        pip_end_expr = "p.pip_end_date" if has_pip_end_date else "NULL::date"
        notice_start_expr = "p.notice_start_date" if has_notice_start_date else "NULL::date"
        notice_end_expr = "p.notice_end_date" if has_notice_end_date else "NULL::date"

        # Refactored Optimized Query
        query = (
            "WITH SkillsAgg AS ("
            "    SELECT es.employee_id, ARRAY_AGG(DISTINCT s.skill_name) as skills "
            "    FROM employee_skills es "
            "    JOIN skills s ON es.skill_id = s.skill_id "
            "    GROUP BY es.employee_id"
            "), "
            "AllocAgg AS ("
            "    SELECT "
            "        pa.employee_id, "
            "        COALESCE(SUM(pa.allocation_percentage), 0) as total_alloc, "
            "        MAX(CASE "
            "            WHEN COALESCE(pa.allocation_percentage, 0) > 0 AND (LOWER(pa.project_tags)='billable' OR LOWER(pa.project_tags)='yes' OR LOWER(pa.project_tags)='y') THEN 3 "
            "            WHEN COALESCE(pa.allocation_percentage, 0) > 0 AND (LOWER(pa.project_tags) LIKE '%%non%%' OR LOWER(pa.project_tags) = 'no') THEN 2 "
            "            WHEN COALESCE(pa.allocation_percentage, 0) = 0 AND (LOWER(pa.project_tags)='billable' OR LOWER(pa.project_tags)='yes' OR LOWER(pa.project_tags)='y') THEN 1 "
            "            ELSE 0 "
            "        END) as priority_rank "
            "    FROM projects_allocation pa "
            "    LEFT JOIN projects pj ON pa.project_id = pj.project_id "
            "    WHERE pa.allocation_start_date <= CURRENT_DATE "
            "      AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE) "
            "      AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold') "
            "    GROUP BY pa.employee_id"
            ") "
            "SELECT "
            "    m.employee_id, m.employee_name, m.role_designation, m.department, m.location, "
            "    m.photo_url, m.email_id, m.phone_number, m.date_of_joining, "
            "    COALESCE(" + employee_type_expr + ", 'Full Time') as employee_type, "
            "    CASE "
            "        WHEN p.employee_status ILIKE '%%notice%%' AND " + notice_end_expr + " IS NOT NULL AND " + notice_end_expr + " < CURRENT_DATE THEN 'Resigned' "
            "        WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status "
            "        WHEN p.employee_status ILIKE '%%pip%%' THEN p.employee_status "
            "        WHEN p.employee_status ILIKE '%%resign%%' THEN p.employee_status "
            "        WHEN COALESCE(al.total_alloc, 0) <= 0 THEN 'Bench' "
            "        WHEN COALESCE(al.total_alloc, 0) BETWEEN 1 AND 40 THEN 'Partially bench' "
            "        WHEN COALESCE(al.total_alloc, 0) BETWEEN 41 AND 80 THEN 'Partially allocated' "
            "        ELSE 'Allocated' "
            "    END as employee_status, "
            "    CASE "
            "        WHEN al.priority_rank = 3 THEN 'billable' "
            "        WHEN al.priority_rank = 2 THEN 'non-billable' "
            "        WHEN al.priority_rank = 1 THEN 'billable' "
            "        ELSE 'bench' "
            "    END as billable, "
            "    COALESCE(al.total_alloc, 0) as employee_allocations, "
            "    m.date_of_resign, "
            "    " + pip_start_expr + " as pip_start_date, "
            "    " + pip_end_expr + " as pip_end_date, "
            "    " + notice_start_expr + " as notice_start_date, "
            "    " + notice_end_expr + " as notice_end_date, "
            "    COALESCE(sk.skills, ARRAY[]::text[]) as skills "
            "FROM employee_master m "
            "LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id "
            "LEFT JOIN SkillsAgg sk ON m.employee_id = sk.employee_id "
            "LEFT JOIN AllocAgg al ON m.employee_id = al.employee_id "
            "WHERE (m.date_of_resign IS NULL OR m.date_of_resign > CURRENT_DATE OR %s = TRUE) "
            "  AND " + is_deleted_expr + " "
            "ORDER BY m.employee_name ASC"
        )
        cur.execute(query, (include_resigned, include_deleted))
        columns = [desc[0] for desc in cur.description]
        
        results = []
        for row in cur.fetchall():
            d = dict(zip(columns, row))
            if d.get('role_designation', '').strip().upper() == 'CSE':
                d['role_designation'] = 'Cloud Solution Engineer'
            results.append(d)
        return results

@router.get("/employees/upcoming-bench")
def get_upcoming_bench():
    with db_cursor() as cur:
        query = """
            SELECT 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.photo_url,
                pa.allocation_end_date as bench_date,
                ARRAY_AGG(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL) as skills
            FROM employee_master m
            JOIN projects_allocation pa ON m.employee_id = pa.employee_id
            LEFT JOIN projects pj ON pa.project_id = pj.project_id
            LEFT JOIN employee_skills es ON m.employee_id = es.employee_id
            LEFT JOIN skills s ON es.skill_id = s.skill_id
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
            AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
            AND NOT EXISTS (
                SELECT 1 FROM projects_allocation pa2
                LEFT JOIN projects pj2 ON pa2.project_id = pj2.project_id
                WHERE pa2.employee_id = m.employee_id
                  AND pa2.allocation_id <> pa.allocation_id
                  AND (pa2.allocation_end_date > pa.allocation_end_date OR pa2.allocation_end_date IS NULL)
                  AND COALESCE(LOWER(pj2.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
            )
            GROUP BY 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.photo_url,
                pa.allocation_end_date
            ORDER BY bench_date ASC
        """
        cur.execute(query)
        columns = [desc[0] for desc in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        for row in results:
             if row.get('skills') is None:
                  row['skills'] = []
                  
        return results

@router.get("/employees/new-joiners")
def get_new_joiners():
    with db_cursor() as cur:
        # Fetch employees who joined in the last 90 days and are active (not on notice period)
        query = """
            SELECT 
                m.employee_id,
                m.employee_name,
                m.role_designation,
                m.photo_url,
                p.employee_status
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE m.date_of_joining >= NOW() - INTERVAL '90 days'
            AND m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
            ORDER BY m.date_of_joining DESC
        """
        cur.execute(query)
        columns = [desc[0] for desc in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        return results

@router.get("/employees/employee-of-month")
def fetch_employee_of_month():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Highest allocation employee — use live SUM from projects_allocation
        query = """
            SELECT 
                m.employee_id,
                m.employee_name,
                m.role_designation,
                m.photo_url,
                COALESCE(SUM(pa.allocation_percentage), 0) as employee_allocations
            FROM employee_master m
            LEFT JOIN projects_allocation pa ON m.employee_id = pa.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
            WHERE m.date_of_resign IS NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
            GROUP BY m.employee_id, m.employee_name, m.role_designation, m.photo_url
            HAVING COALESCE(SUM(pa.allocation_percentage), 0) > 0
            ORDER BY employee_allocations DESC, m.date_of_joining ASC
            LIMIT 1
        """
        cur.execute(query)
        row = cur.fetchone()
        if not row:
            return None
            
        columns = [desc[0] for desc in cur.description]
        return dict(zip(columns, row))
    except Exception as e:
        print(f"Error fetching employee of month: {e}")
        return None
    finally:
        cur.close()
        release_db_connection(conn)

@router.post("/employees/nominate")
def nominate_employee(nom: NominationInput):
    return {"detail": "Nominations are not supported in the current schema version."}

@router.get("/employees/action-inbox")
def fetch_action_inbox():
    conn = get_db_connection()
    cur = conn.cursor()
    tasks = []
    task_id_counter = 1
    
    try:
        # Dynamic Task 1: Find employees on notice period (requires exit interview)
        notice_query = """
            SELECT m.employee_name, m.department
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE m.date_of_resign IS NOT NULL AND (m.is_deleted IS FALSE OR m.is_deleted IS NULL)
              AND (p.employee_status IS NULL OR p.employee_status != 'Exited')
        """
        cur.execute(notice_query)
        notice_rows = cur.fetchall()
        
        for row in notice_rows:
            tasks.append({
                "id": task_id_counter,
                "title": 'Exit Interview Required',
                "description": f"{row[0]} is serving their notice period. Please schedule an exit sync.",
                "iconName": 'ShieldAlert',
                "color": 'text-red-600',
                "bg": 'bg-red-50',
                "urgent": True,
                "time": 'Action Required',
                "department": row[1]
            })
            task_id_counter += 1

        # Dynamic Task 2: Find employees approaching probation end (e.g. joined ~3-6 months ago)
        probation_query = """
            SELECT employee_name, department, date_of_joining
            FROM employee_master
            WHERE date_of_joining > NOW() - INTERVAL '100 days'
              AND date_of_joining <= NOW() - INTERVAL '80 days'
              AND date_of_resign IS NULL AND (is_deleted IS FALSE OR is_deleted IS NULL)
        """
        cur.execute(probation_query)
        prob_rows = cur.fetchall()
        for row in prob_rows:
             tasks.append({
                "id": task_id_counter,
                "title": 'Probation Confirmation',
                "description": f"Review performance for {row[0]} who is near their 90-day probation end.",
                "iconName": 'BadgeCheck',
                "color": 'text-emerald-600',
                "bg": 'bg-emerald-50',
                "urgent": False,
                "time": 'Action Required',
                "department": row[1]
            })
             task_id_counter += 1
             
    except Exception as e:
        print(f"Error generating action inbox: {e}")
    finally:
        cur.close()
        release_db_connection(conn)
        
    return tasks

@router.get("/employees/filter-options")
def get_employee_filter_options():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT department FROM employee_master WHERE department IS NOT NULL AND department != ''")
        departments = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT DISTINCT location FROM employee_master WHERE location IS NOT NULL AND location != ''")
        locations = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT DISTINCT skill_name FROM skills WHERE skill_name IS NOT NULL AND skill_name != ''")
        skills = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT DISTINCT employee_type FROM employee_master WHERE employee_type IS NOT NULL AND employee_type != ''")
        employee_types = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT DISTINCT employee_status FROM employee_master_pro WHERE employee_status IS NOT NULL AND employee_status != ''")
        status_tags = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT DISTINCT employee_name FROM employee_master WHERE date_of_resign IS NULL ORDER BY employee_name")
        employee_names = [row[0] for row in cur.fetchall()]

        # Ensure known statuses like 'Allocated' exist if empty
        if not status_tags:
            status_tags = ['Allocated', 'Bench', 'Partially allocated', 'Notice period', 'Partially bench', 'PIP', 'Resigned']

        return {
            "departments": sorted(departments),
            "locations": sorted(locations),
            "employee_types": sorted(employee_types),
            "skills": sorted(skills),
            "status_tags": sorted(status_tags),
            "employee_names": employee_names
        }
    except Exception as e:
        print(f"Error fetching filter options: {e}")
        return {"error": str(e), "departments": [], "locations": [], "employee_types": [], "skills": [], "status_tags": []}
    finally:
        if cur: cur.close()
        if conn: release_db_connection(conn)

@router.get("/departments/roles-mapping")
@router.get("/employees/departments/roles-mapping")  # Frontend expects /employees prefix
def get_departments_roles_mapping():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT department, role_designation FROM employee_master WHERE department IS NOT NULL AND role_designation IS NOT NULL")
        mapping = {}
        for row in cur.fetchall():
            dep, role = row[0].strip(), row[1].strip()
            if not dep or not role: continue
            if dep not in mapping:
                mapping[dep] = set()
            
            # Normalize CSE
            if role.upper() == 'CSE':
                role = 'Cloud Solution Engineer'
            mapping[dep].add(role)
        
        # Convert sets to sorted lists
        return {k: sorted(list(v)) for k, v in mapping.items()}
    except Exception as e:
        print(f"Error fetching dept/role mapping: {e}")
        return {}
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employee/by-email/{email_id}")
def get_employee_id_by_email(email_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Prevent any potential SQL syntax issues if email_id is weirdly formatted
        safe_email = email_id.strip()
        
        cur.execute("SELECT employee_id FROM employee_master WHERE LOWER(email_id) = LOWER(%s)", (safe_email,))
        row = cur.fetchone()
        
        if not row:
            return {"employee_id": None, "linked": False, "message": "No matching employee found."}
            
        return {"employee_id": row[0], "linked": True}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"CRITICAL Error looking up employee by email ({email_id}): {str(e)}\n{error_details}")
        # Return a graceful JSON payload instead of an abrupt 500 to prevent frontend crashes
        # though a 500 is standard for unexpected errors. We'll return 500 with detail.
        raise HTTPException(status_code=500, detail=f"Database lookup failed: {str(e)}")
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employees/{employee_id}")
def get_employee_by_id(employee_id: str):
    with db_cursor() as cur:
        _ensure_employee_columns(cur)
        has_pip_start_date = _table_has_column(cur, "employee_master_pro", "pip_start_date")
        has_pip_end_date = _table_has_column(cur, "employee_master_pro", "pip_end_date")
        has_notice_start_date = _table_has_column(cur, "employee_master_pro", "notice_start_date")
        has_notice_end_date = _table_has_column(cur, "employee_master_pro", "notice_end_date")
        has_dob = _table_has_column(cur, "employee_master", "date_of_birth")
        has_address = _table_has_column(cur, "employee_master", "address")

        pip_start_expr = "p.pip_start_date" if has_pip_start_date else "NULL::date"
        pip_end_expr = "p.pip_end_date" if has_pip_end_date else "NULL::date"
        notice_start_expr = "p.notice_start_date" if has_notice_start_date else "NULL::date"
        notice_end_expr = "p.notice_end_date" if has_notice_end_date else "NULL::date"
        dob_expr = "m.date_of_birth" if has_dob else "NULL::text"
        address_expr = "m.address" if has_address else "NULL::text"

        notice_status_expr = (
            "WHEN p.employee_status ILIKE '%%notice%%' AND p.notice_end_date IS NOT NULL AND p.notice_end_date < CURRENT_DATE THEN 'Resigned'\n                WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status"
            if has_notice_end_date
            else "WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status"
        )
        
        # 1️⃣ Fetch Main Employee Details
        # Check if the identifier is an email (contains '@')
        is_email = "@" in employee_id
        id_filter = "WHERE LOWER(m.email_id) = LOWER(%s)" if is_email else "WHERE m.employee_id = %s"

        employee_query = (
            "WITH AllocationPriority AS ("
            "    SELECT "
            "        employee_id, "
            "        MAX(CASE "
            "            WHEN coalesce(allocation_percentage, 0) > 0 AND LOWER(project_tags) IN ('billable', 'yes') THEN 3 "
            "            WHEN coalesce(allocation_percentage, 0) > 0 AND (LOWER(project_tags) LIKE '%%non%%' OR LOWER(project_tags) = 'no') THEN 2 "
            "            WHEN coalesce(allocation_percentage, 0) = 0 AND LOWER(project_tags) IN ('billable', 'yes') THEN 1 "
            "            ELSE 0 "
            "        END) as priority_rank "
            "    FROM projects_allocation "
            "    WHERE (allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE) "
            "    GROUP BY employee_id"
            "), "
            "DynAlloc AS ("
            "    SELECT employee_id, COALESCE(SUM(allocation_percentage), 0) as total_alloc "
            "        FROM projects_allocation "
            "        WHERE allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE "
            "        GROUP BY employee_id "
            ") "
            "SELECT "
            "    m.employee_id, "
            "    m.employee_name, "
            "    m.role_designation, "
            "    m.department, "
            "    m.location, "
            "    m.photo_url, "
            "    m.email_id, "
            "    m.phone_number, "
            "    m.date_of_joining, "
            "    m.total_experience, "
            "    m.experience_in_cd, "
            "    m.shift, "
            "    m.mode_of_work, "
            "    CASE " +
            "        " + notice_status_expr + " "
            "        WHEN p.employee_status ILIKE '%%pip%%'    THEN p.employee_status "
            "        WHEN p.employee_status ILIKE '%%resign%%' THEN p.employee_status "
            "        WHEN COALESCE(da.total_alloc, 0) <= 0 THEN 'Bench' "
            "        WHEN COALESCE(da.total_alloc, 0) BETWEEN 1 AND 40 THEN 'Partially bench' "
            "        WHEN COALESCE(da.total_alloc, 0) BETWEEN 41 AND 80 THEN 'Partially allocated' "
            "        WHEN COALESCE(da.total_alloc, 0) >= 81 THEN 'Allocated' "
            "        ELSE p.employee_status "
            "    END as employee_status, "
            "    CASE "
            "        WHEN ap.priority_rank = 3 THEN 'billable' "
            "        WHEN ap.priority_rank = 2 THEN 'non-billable' "
            "        WHEN ap.priority_rank = 1 THEN 'billable' "
            "        ELSE 'non-billable' "
            "    END as billable, "
            "    COALESCE(da.total_alloc, 0) as employee_allocations, "
            "    m.date_of_resign, "
            "    " + pip_start_expr + " as pip_start_date, "
            "    " + pip_end_expr + " as pip_end_date, "
            "    " + notice_start_expr + " as notice_start_date, "
            "    " + notice_end_expr + " as notice_end_date, "
            "    p.reporting_manager_id, "
            "    mgr.employee_name as reporting_manager_name, "
            "    " + dob_expr + " as date_of_birth, "
            "    " + address_expr + " as address "
            "FROM employee_master m "
            "LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id "
            "LEFT JOIN AllocationPriority ap ON m.employee_id = ap.employee_id "
            "LEFT JOIN DynAlloc da ON m.employee_id = da.employee_id "
            "LEFT JOIN employee_master mgr ON p.reporting_manager_id = mgr.employee_id "
            f"{id_filter}"
        )

        cur.execute(employee_query, (employee_id,))
        employee_row = cur.fetchone()

        if not employee_row:
            # If not found by identifier, 404
            raise HTTPException(status_code=404, detail="Employee not found")

        columns = [desc[0] for desc in cur.description]
        employee = dict(zip(columns, employee_row))

        if employee.get('role_designation', '').strip().upper() == 'CSE':
            employee['role_designation'] = 'Cloud Solution Engineer'

        # Real employee_id for downstream queries (even if we fetched by email)
        real_employee_id = employee.get("employee_id")

        # 2️⃣ Fetch Skills
        skills_query = """
        SELECT s.skill_name, es.proficiency_level, es.years_of_experience
        FROM employee_skills es
        JOIN skills s ON es.skill_id = s.skill_id
        WHERE es.employee_id = %s
        """
        cur.execute(skills_query, (real_employee_id,))
        skills_rows = cur.fetchall()

        skills = [
            {
                "skill": row[0],
                "proficiency": row[1],
                "experience_years": float(row[2]) if row[2] else 0
            }
            for row in skills_rows
        ]


        # 3️⃣ Fetch Certificates
        certificates_query = """
        SELECT c.certificate_name
        FROM employee_certificates ec
        JOIN certificates c 
        ON ec.certificate_id = c.certificate_id
        WHERE ec.employee_id = %s
        """
        cur.execute(certificates_query, (real_employee_id,))
        cert_rows = cur.fetchall()

        certificates = [row[0] for row in cert_rows]


        # 4️⃣ Fetch Projects & Allocations (with project manager name)
        projects_query = """
        SELECT 
            pa.project_id,
            p.project_name,
            pa.role_in_project,
            pa.allocation_percentage,
            pa.allocation_start_date,
            pa.allocation_end_date,
            p.project_status,
            pa.project_tags,
            (
                SELECT em2.employee_name
                FROM projects_allocation pa2
                JOIN employee_master em2 ON pa2.employee_id = em2.employee_id
                WHERE pa2.project_id = p.project_id
                  AND (
                        LOWER(pa2.role_in_project) LIKE '%%manager%%'
                     OR LOWER(pa2.role_in_project) LIKE '%%lead%%'
                     OR LOWER(pa2.role_in_project) LIKE '%%pm%%'
                     OR LOWER(em2.role_designation) LIKE '%%manager%%'
                     OR LOWER(em2.role_designation) LIKE '%%lead%%'
                   )
                LIMIT 1
            ) AS project_manager_name
        FROM projects_allocation pa
        JOIN projects p 
        ON pa.project_id = p.project_id
        WHERE pa.employee_id = %s
        """
        cur.execute(projects_query, (real_employee_id,))
        project_rows = cur.fetchall()

        projects = [
            {
                "project_id": row[0],
                "project_name": row[1],
                "project_role": row[2],
                "project_allocation": row[3],
                "project_start_date": row[4],
                "project_end_date": row[5],
                "status": row[6],
                "billable": row[7],
                "project_manager": row[8]
            }
            for row in project_rows
        ]


        # 5️⃣ Construct Final Response
        response = {
            "employee_id": employee.get("employee_id"),
            "name": employee.get("employee_name"),
            "designation": employee.get("role_designation"),
            "department": employee.get("department"),
            "location": employee.get("location"),
            "email": employee.get("email_id"),
            "phone": employee.get("phone_number"),
            "photo_url": employee.get("photo_url"),
            "reporting_manager": employee.get("reporting_manager_name") or employee.get("reporting_manager_id"),
            "reporting_manager_id": employee.get("reporting_manager_id"),
            "date_of_joining": employee.get("date_of_joining"),
            "total_experience": float(employee.get("total_experience") or 0),
            "cd_experience": float(employee.get("experience_in_cd") or 0),
            "shift": employee.get("shift"),
            "mode_of_work": employee.get("mode_of_work"),
            "employee_status": employee.get("employee_status"),
            "billable": employee.get("billable"),
            "employee_allocations": employee.get("employee_allocations"),
            "date_of_resign": str(employee.get("date_of_resign")) if employee.get("date_of_resign") else None,
            "pip_start_date": str(employee.get("pip_start_date")) if employee.get("pip_start_date") else None,
            "pip_end_date": str(employee.get("pip_end_date")) if employee.get("pip_end_date") else None,
            "notice_start_date": str(employee.get("notice_start_date")) if employee.get("notice_start_date") else None,
            "notice_end_date": str(employee.get("notice_end_date")) if employee.get("notice_end_date") else None,
            "date_of_birth": employee.get("date_of_birth"),
            "address": employee.get("address"),
            "skills": skills,
            "certificates": certificates,
            "projects": projects
        }

        return response

def _perform_employee_update(cur, employee_id, emp: EmployeeCreateUpdate):
    """Internal helper to perform a full update of an employee record."""
    # Check if Email is already used by ANOTHER employee
    cur.execute("SELECT employee_id FROM employee_master WHERE LOWER(email_id) = LOWER(%s) AND employee_id != %s", (emp.email, employee_id))
    email_match = cur.fetchone()
    if email_match:
        raise HTTPException(
            status_code=400, 
            detail=f"Email '{emp.email}' is already used by another employee ({email_match[0]})"
        )

    # Check for optional columns in schema
    has_dob = _table_has_column(cur, "employee_master", "date_of_birth")
    has_address = _table_has_column(cur, "employee_master", "address")

    # 1. Update employee_master
    phone_digits = "".join(filter(str.isdigit, str(emp.phone))) if emp.phone else ""
    phone_numeric = int(phone_digits) if phone_digits else None
    update_fields = [
        "employee_name = %s", "email_id = %s", "phone_number = %s", "location = %s",
        "mode_of_work = %s", "date_of_joining = %s", "role_designation = %s", "department = %s",
        "employee_type = %s", "date_of_resign = %s", "shift = %s"
    ]
    update_params = [
        emp.employee_name, emp.email, phone_numeric, emp.location,
        emp.work_mode, emp.date_of_joining, emp.role_designation, emp.department,
        emp.employment_type, emp.date_of_resign, emp.shift
    ]
    
    if emp.photo_url:
        update_fields.append("photo_url = %s")
        update_params.append(emp.photo_url)

    if has_dob:
        update_fields.append("date_of_birth = %s")
        update_params.append(emp.date_of_birth)
    if has_address:
        update_fields.append("address = %s")
        update_params.append(emp.address)

    cur.execute(f"""
        UPDATE employee_master SET
            {", ".join(update_fields)}
        WHERE employee_id = %s
    """, update_params + [employee_id])

    # 2. Update employee_master_pro
    cur.execute("SELECT employee_id FROM employee_master_pro WHERE employee_id = %s", (employee_id,))
    if cur.fetchone():
        cur.execute("""
            UPDATE employee_master_pro SET
                employee_status = %s, employee_allocations = %s, reporting_manager_id = %s,
                pip_start_date = %s, pip_end_date = %s, notice_start_date = %s, notice_end_date = %s
            WHERE employee_id = %s
        """, (emp.employee_status, emp.employee_allocations, emp.reporting_manager_id, emp.pip_start_date, emp.pip_end_date, emp.notice_start_date, emp.notice_end_date, employee_id))
    else:
        cur.execute("""
            INSERT INTO employee_master_pro (employee_id, employee_status, employee_allocations, reporting_manager_id, pip_start_date, pip_end_date, notice_start_date, notice_end_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (employee_id, emp.employee_status, emp.employee_allocations, emp.reporting_manager_id, emp.pip_start_date, emp.pip_end_date, emp.notice_start_date, emp.notice_end_date))

    # 3. Update skills (delete old, insert new)
    cur.execute("DELETE FROM employee_skills WHERE employee_id = %s", (employee_id,))
    for skill_name in emp.skills:
        cur.execute("SELECT skill_id FROM skills WHERE skill_name = %s", (skill_name,))
        skill_row = cur.fetchone()
        if skill_row:
            skill_id = skill_row[0]
        else:
            cur.execute("INSERT INTO skills (skill_name) VALUES (%s) RETURNING skill_id", (skill_name,))
            skill_id = cur.fetchone()[0]
        cur.execute("INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES (%s, %s, 1, 0) ON CONFLICT DO NOTHING", (employee_id, skill_id))

    # 4. Update projects (delete old, insert new)
    cur.execute("DELETE FROM projects_allocation WHERE employee_id = %s", (employee_id,))
    for proj in emp.projects:
        # Validate project exists before inserting to prevent FK constraint errors
        cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (proj.project_id,))
        if not cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail=f"Project '{proj.project_id}' does not exist. Please select a valid project."
            )
        allocation_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO projects_allocation (
                allocation_id, employee_id, project_id, role_in_project,
                allocation_percentage, allocation_start_date, allocation_end_date, project_tags
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'billable')
        """, (
            allocation_id, employee_id, proj.project_id, proj.project_role,
            proj.project_allocation, proj.project_start_date, proj.project_end_date
        ))

    # Sync
    _sync_employee_allocations(cur, [employee_id])

    # 5. Update certificates
    cur.execute("DELETE FROM employee_certificates WHERE employee_id = %s", (employee_id,))
    for cert in emp.certificates:
        cur.execute("""
            INSERT INTO certificates (certificate_name) VALUES (%s)
            ON CONFLICT DO NOTHING RETURNING certificate_id
        """, (cert.name,))
        cert_id_row = cur.fetchone()
        if not cert_id_row:
            cur.execute("SELECT certificate_id FROM certificates WHERE certificate_name = %s", (cert.name,))
            cert_id_row = cur.fetchone()
        
        if cert_id_row:
            cert_id = cert_id_row[0]
            cur.execute("INSERT INTO employee_certificates (employee_id, certificate_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (employee_id, cert_id))


@router.post("/employees")
def create_employee(emp: EmployeeCreateUpdate, upsert: bool = False):
    with db_cursor() as cur:
        _ensure_employee_columns(cur)
        # Check if exists by ID
        cur.execute("SELECT employee_id FROM employee_master WHERE employee_id = %s", (emp.employee_id,))
        if cur.fetchone():
            if upsert:
                _perform_employee_update(cur, emp.employee_id, emp)
                return {"detail": "Employee updated successfully (Upsert)"}
            else:
                raise HTTPException(status_code=400, detail="Employee ID already exists")

        # Check if exists by Email (New Check)
        cur.execute("SELECT employee_id FROM employee_master WHERE LOWER(email_id) = LOWER(%s)", (emp.email,))
        email_match = cur.fetchone()
        if email_match:
            matching_id = email_match[0]
            # Even if upsert is True, if the IDs don't match, we reject to prevent data corruption
            raise HTTPException(
                status_code=400, 
                detail=f"Email '{emp.email}' already exists for another Employee ID ({matching_id})"
            )

        # 1. Insert into employee_master (Standard Create)
        has_dob = _table_has_column(cur, "employee_master", "date_of_birth")
        has_address = _table_has_column(cur, "employee_master", "address")
        phone_digits = "".join(filter(str.isdigit, str(emp.phone))) if emp.phone else ""
        phone_numeric = int(phone_digits) if phone_digits else None
        
        cols = ["employee_id", "employee_name", "email_id", "phone_number", "location", "mode_of_work", "date_of_joining", "role_designation", "department", "employee_type", "photo_url", "date_of_resign", "shift"]
        vals = [emp.employee_id, emp.employee_name, emp.email, phone_numeric, emp.location, emp.work_mode, emp.date_of_joining, emp.role_designation, emp.department, emp.employment_type, emp.photo_url, emp.date_of_resign, emp.shift]
        
        if has_dob:
            cols.append("date_of_birth"); vals.append(emp.date_of_birth)
        if has_address:
            cols.append("address"); vals.append(emp.address)

        placeholders = ", ".join(["%s"] * len(cols))
        cur.execute(f"INSERT INTO employee_master ({', '.join(cols)}) VALUES ({placeholders})", tuple(vals))

        # 2. Insert into employee_master_pro
        cur.execute("""
            INSERT INTO employee_master_pro (employee_id, employee_status, employee_allocations, reporting_manager_id, pip_start_date, pip_end_date, notice_start_date, notice_end_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (emp.employee_id, emp.employee_status, emp.employee_allocations, emp.reporting_manager_id, emp.pip_start_date, emp.pip_end_date, emp.notice_start_date, emp.notice_end_date))

        # 3. Handle skills
        for skill_name in emp.skills:
            # Case-insensitive check to reuse existing skills
            cur.execute("SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(%s)", (skill_name,))
            skill_row = cur.fetchone()
            if skill_row:
                skill_id = skill_row[0]
            else:
                # Skill doesn't exist, insert it. Trigger generate_skill_id handles the SKL- prefix.
                cur.execute("INSERT INTO skills (skill_name) VALUES (%s) RETURNING skill_id", (skill_name,))
                skill_id = cur.fetchone()[0]
            
            cur.execute("INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES (%s, %s, 1, 0) ON CONFLICT DO NOTHING", (emp.employee_id, skill_id))

        # 4. Handle projects
        for proj in emp.projects:
            # Validate project exists before inserting to prevent FK constraint errors
            cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (proj.project_id,))
            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail=f"Project '{proj.project_id}' does not exist. Please select a valid project."
                )
            allocation_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO projects_allocation (
                    allocation_id, employee_id, project_id, role_in_project,
                    allocation_percentage, allocation_start_date, allocation_end_date, project_tags
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'billable')
            """, (allocation_id, emp.employee_id, proj.project_id, proj.project_role, proj.project_allocation, proj.project_start_date, proj.project_end_date))

        _sync_employee_allocations(cur, [emp.employee_id])

        # 5. Handle certificates
        for cert in emp.certificates:
            cur.execute("INSERT INTO certificates (certificate_name) VALUES (%s) ON CONFLICT DO NOTHING RETURNING certificate_id", (cert.name,))
            cid = cur.fetchone()
            if not cid:
                cur.execute("SELECT certificate_id FROM certificates WHERE certificate_name = %s", (cert.name,))
                cid = cur.fetchone()
            if cid:
                cur.execute("INSERT INTO employee_certificates (employee_id, certificate_id) VALUES (%s, %s)", (emp.employee_id, cid[0]))

        return {"detail": "Employee created successfully"}

@router.put("/employees/{employee_id}")
def update_employee(employee_id: str, emp: EmployeeCreateUpdate):
    with db_cursor() as cur:
        # Check if the identifier is an email (contains '@')
        is_email = "@" in employee_id
        id_filter = "WHERE LOWER(email_id) = LOWER(%s)" if is_email else "WHERE employee_id = %s"
        
        cur.execute(f"SELECT employee_id FROM employee_master {id_filter}", (employee_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        actual_id = row[0]
        _perform_employee_update(cur, actual_id, emp)
        return {"detail": "Employee updated successfully", "new_id": actual_id}

@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, permanent: bool = Query(False)):
    with db_cursor() as cur:
        # Check if the identifier is an email (contains '@')
        is_email = "@" in employee_id
        id_filter = "WHERE LOWER(email_id) = LOWER(%s)" if is_email else "WHERE employee_id = %s"

        cur.execute(f"SELECT employee_id FROM employee_master {id_filter}", (employee_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Employee not found")

        actual_id = row[0]
        
        if permanent:
            # 1. Cascade delete from all dependent tables
            # Note: reporting_manager_id in master_pro is a self-reference to employee_master
            # We should nullify any references first to avoid FK violations if this employee is a manager
            cur.execute("UPDATE employee_master_pro SET reporting_manager_id = NULL WHERE reporting_manager_id = %s", (actual_id,))
            
            # Delete related records
            cur.execute("DELETE FROM employee_certificates WHERE employee_id = %s", (actual_id,))
            cur.execute("DELETE FROM employee_skills WHERE employee_id = %s", (actual_id,))
            cur.execute("DELETE FROM weekly_allocations WHERE allocation_id IN (SELECT allocation_id FROM projects_allocation WHERE employee_id = %s)", (actual_id,))
            cur.execute("DELETE FROM projects_allocation WHERE employee_id = %s", (actual_id,))
            cur.execute("DELETE FROM users WHERE employee_id = %s", (actual_id,))
            cur.execute("DELETE FROM employee_master_pro WHERE employee_id = %s", (actual_id,))
            
            # 2. Finally, delete from employee_master
            cur.execute("DELETE FROM employee_master WHERE employee_id = %s", (actual_id,))
            return {"detail": "Employee permanently deleted from database"}
        else:
            # Standard Soft Delete
            cur.execute("UPDATE employee_master SET is_deleted = TRUE WHERE employee_id = %s", (actual_id,))
            return {"detail": "Employee soft-deleted (archived) successfully"}


@router.put("/employees/{employee_id}/restore")
def restore_employee(employee_id: str):
    with db_cursor() as cur:
        cur.execute("SELECT employee_id FROM employee_master WHERE employee_id = %s", (employee_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")

        # 1. Reset is_deleted
        cur.execute("UPDATE employee_master SET is_deleted = FALSE, date_of_resign = NULL WHERE employee_id = %s", (employee_id,))
        
        # 2. Reset status to Bench on master_pro (since they are returning)
        cur.execute("UPDATE employee_master_pro SET employee_status = 'Bench' WHERE employee_id = %s", (employee_id,))

        return {"detail": "Employee restored successfully"}

@router.get('/employees/allocations/weekly')
def get_all_employee_weekly_allocations():
    with db_cursor() as cur:
        cur.execute("""
            SELECT pa.employee_id, wa.allocation_year, wa.week_number, SUM(wa.allocated_hours)
            FROM weekly_allocations wa
            JOIN projects_allocation pa ON wa.allocation_id = pa.allocation_id
            WHERE wa.allocation_year IS NOT NULL AND wa.week_number IS NOT NULL
            GROUP BY pa.employee_id, wa.allocation_year, wa.week_number
        """)
        rows = cur.fetchall()
        
        result = {}
        for row in rows:
            emp_id, year, week, hours = row
            if emp_id not in result:
                result[emp_id] = {}
            result[emp_id][f"{year}-{week}"] = float(hours)
            
        return result
