from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import uuid


def _sync_employee_allocations(cur, employee_ids):
    """Re-compute employee_allocations in employee_master_pro from live projects_allocation rows."""
    if not employee_ids:
        return
    cur.execute("""
        UPDATE employee_master_pro p
        SET employee_allocations = COALESCE((
            SELECT SUM(pa.allocation_percentage)
            FROM projects_allocation pa
            WHERE pa.employee_id = p.employee_id
        ), 0),
        employee_status = CASE
            WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status
            WHEN COALESCE((
                SELECT SUM(pa2.allocation_percentage)
                FROM projects_allocation pa2
                WHERE pa2.employee_id = p.employee_id
            ), 0) <= 0 THEN 'Bench'
            WHEN COALESCE((
                SELECT SUM(pa2.allocation_percentage)
                FROM projects_allocation pa2
                WHERE pa2.employee_id = p.employee_id
            ), 0) BETWEEN 1 AND 40 THEN 'Partially bench'
            WHEN COALESCE((
                SELECT SUM(pa2.allocation_percentage)
                FROM projects_allocation pa2
                WHERE pa2.employee_id = p.employee_id
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
    reporting_manager_id: Optional[str] = None
    skills: List[str] = []
    projects: List[ProjectAllocationInput] = []
    certificates: List[CertificateInput] = []

class NominationInput(BaseModel):
    employee_id: str
    nominator_role: str
    feedback_text: str
    month: str

router = APIRouter()

@router.post("/employee/count")
def get_total_employee_count():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NULL")
        count = cur.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error fetching employee count: {e}")
        return 0 
    finally:
        cur.close()
        release_db_connection(conn)

@router.post("/employee/bench")
def get_bench_employee_count():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT COUNT(DISTINCT m.employee_id)
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE m.date_of_resign IS NULL
              AND (p.employee_status NOT ILIKE '%%notice%%' OR p.employee_status IS NULL)
              AND COALESCE((
                  SELECT SUM(pa.allocation_percentage)
                  FROM projects_allocation pa
                  WHERE pa.employee_id = m.employee_id
              ), 0) <= 0
        """)
        count = cur.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error fetching bench employee count: {e}")
        return 0
    finally:
        cur.close()
        release_db_connection(conn)

@router.post("/employee/notice")
def get_notice_employee_count():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM employee_master WHERE date_of_resign IS NOT NULL")
        count = cur.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error fetching notice period employee count: {e}")
        return 0
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employees/roles")
def get_employee_roles():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT DISTINCT role_designation FROM employee_master WHERE role_designation IS NOT NULL ORDER BY role_designation")
        roles = [r[0] for r in cur.fetchall()]
        return {"All": roles}
    except Exception as e:
        print(f"Error fetching roles: {e}")
        return []
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employees/list")
def get_all_employees():
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            WITH AllocationPriority AS (
                SELECT 
                    employee_id,
                    MAX(CASE 
                        WHEN coalesce(allocation_percentage, 0) > 0 AND LOWER(project_tags) = 'billable' THEN 3
                        WHEN coalesce(allocation_percentage, 0) > 0 AND LOWER(project_tags) = 'nonbillable' THEN 2
                        WHEN coalesce(allocation_percentage, 0) = 0 AND LOWER(project_tags) = 'billable' THEN 1
                        ELSE 0 
                    END) as priority_rank
                FROM projects_allocation
                GROUP BY employee_id
            ),
            DynAlloc AS (
                SELECT employee_id, COALESCE(SUM(allocation_percentage), 0) as total_alloc
                FROM projects_allocation
                WHERE allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE
                GROUP BY employee_id
            )
            SELECT 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.department, 
                m.location, 
                m.photo_url,
                COALESCE(m.employee_type, 'Full Time') as employee_type,
                CASE 
                    WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status
                    WHEN COALESCE(da.total_alloc, 0) <= 0 THEN 'Bench'
                    WHEN COALESCE(da.total_alloc, 0) BETWEEN 1 AND 40 THEN 'Partially bench'
                    WHEN COALESCE(da.total_alloc, 0) BETWEEN 41 AND 80 THEN 'Partially allocated'
                    WHEN COALESCE(da.total_alloc, 0) >= 81 THEN 'Allocated'
                    ELSE p.employee_status 
                END as employee_status, 
                CASE 
                    WHEN ap.priority_rank = 3 THEN 'billable'
                    WHEN ap.priority_rank = 2 THEN 'non-billable'
                    WHEN ap.priority_rank = 1 THEN 'billable'
                    ELSE 'non-billable' 
                END as billable,
                COALESCE(da.total_alloc, 0) as employee_allocations,
                ARRAY_AGG(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL) as skills
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            LEFT JOIN AllocationPriority ap ON m.employee_id = ap.employee_id
            LEFT JOIN DynAlloc da ON m.employee_id = da.employee_id
            LEFT JOIN employee_skills es ON m.employee_id = es.employee_id
            LEFT JOIN skills s ON es.skill_id = s.skill_id
            WHERE m.date_of_resign IS NULL
            GROUP BY 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.department, 
                m.location, 
                m.photo_url, 
                m.employee_type,
                p.employee_status, 
                ap.priority_rank,
                da.total_alloc
        """
        cur.execute(query)
        columns = [column[0] for column in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        # Ensure 'skills' is an empty list if it's None for frontend that expects an array
        for row in results:
             if row.get('skills') is None:
                  row['skills'] = []
                  
        return results

    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employees/upcoming-bench")
def get_upcoming_bench():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.photo_url,
                MIN(pa.allocation_end_date) as bench_date,
                ARRAY_AGG(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL) as skills
            FROM employee_master m
            JOIN projects_allocation pa ON m.employee_id = pa.employee_id
            LEFT JOIN employee_skills es ON m.employee_id = es.employee_id
            LEFT JOIN skills s ON es.skill_id = s.skill_id
            WHERE pa.allocation_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND m.date_of_resign IS NULL
            GROUP BY 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.photo_url
            ORDER BY bench_date ASC
        """
        cur.execute(query)
        columns = [desc[0] for desc in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        
        for row in results:
             if row.get('skills') is None:
                  row['skills'] = []
                  
        return results
    except Exception as e:
        print(f"Error fetching upcoming bench: {e}")
        return []
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employees/new-joiners")
def get_new_joiners():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
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
            AND m.date_of_resign IS NULL
            ORDER BY m.date_of_joining DESC
        """
        cur.execute(query)
        columns = [desc[0] for desc in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        return results
    except Exception as e:
        print(f"Error fetching new joiners: {e}")
        return []
    finally:
        cur.close()
        release_db_connection(conn)

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
            WHERE m.date_of_resign IS NULL
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
            WHERE m.date_of_resign IS NOT NULL 
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
              AND date_of_resign IS NULL
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
    conn = get_db_connection()
    cur = conn.cursor()
    try:
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

        # Ensure known statuses like 'Allocated' exist if empty
        if not status_tags:
            status_tags = ['Allocated', 'Bench', 'Partially allocated', 'Notice period', 'Partially bench']

        return {
            "departments": sorted(departments),
            "locations": sorted(locations),
            "employee_types": sorted(employee_types),
            "skills": sorted(skills),
            "status_tags": sorted(status_tags)
        }
    except Exception as e:
        print(f"Error fetching filter options: {e}")
        return {"error": str(e), "departments": [], "locations": [], "employee_types": [], "skills": [], "status_tags": []}
    finally:
        cur.close()
        release_db_connection(conn)

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
        cur.execute("SELECT employee_id FROM employee_master WHERE LOWER(email_id) = LOWER(%s)", (email_id,))
        row = cur.fetchone()
        if not row:
            return {"employee_id": None, "linked": False}
        return {"employee_id": row[0], "linked": True}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error looking up employee by email: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        cur.close()
        release_db_connection(conn)

@router.get("/employees/{employee_id}")
def get_employee_by_id(employee_id: str):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1️⃣ Fetch Main Employee Details
        employee_query = """
        WITH AllocationPriority AS (
            SELECT 
                employee_id,
                MAX(CASE 
                    WHEN coalesce(allocation_percentage, 0) > 0 AND LOWER(project_tags) = 'billable' THEN 3
                    WHEN coalesce(allocation_percentage, 0) > 0 AND LOWER(project_tags) = 'nonbillable' THEN 2
                    WHEN coalesce(allocation_percentage, 0) = 0 AND LOWER(project_tags) = 'billable' THEN 1
                    ELSE 0 
                END) as priority_rank
            FROM projects_allocation
            GROUP BY employee_id
        ),
        DynAlloc AS (
            SELECT employee_id, COALESCE(SUM(allocation_percentage), 0) as total_alloc
                FROM projects_allocation
                WHERE allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE
                GROUP BY employee_id
        )
        SELECT 
            m.employee_id,
            m.employee_name,
            m.role_designation,
            m.department,
            m.location,
            m.photo_url,
            m.email_id,
            m.phone_number,
            m.date_of_joining,
            m.total_experience,
            m.experience_in_cd,
            m.shift,
            m.mode_of_work,
            CASE 
                WHEN p.employee_status ILIKE '%%notice%%' THEN p.employee_status
                WHEN COALESCE(da.total_alloc, 0) <= 0 THEN 'Bench'
                WHEN COALESCE(da.total_alloc, 0) BETWEEN 1 AND 40 THEN 'Partially bench'
                WHEN COALESCE(da.total_alloc, 0) BETWEEN 41 AND 80 THEN 'Partially allocated'
                WHEN COALESCE(da.total_alloc, 0) >= 81 THEN 'Allocated'
                ELSE p.employee_status 
            END as employee_status,
            CASE 
                WHEN ap.priority_rank = 3 THEN 'billable'
                WHEN ap.priority_rank = 2 THEN 'non-billable'
                WHEN ap.priority_rank = 1 THEN 'billable'
                ELSE 'non-billable' 
            END as billable,
            COALESCE(da.total_alloc, 0) as employee_allocations,
            p.reporting_manager_id,
            mgr.employee_name as reporting_manager_name
        FROM employee_master m
        LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
        LEFT JOIN AllocationPriority ap ON m.employee_id = ap.employee_id
        LEFT JOIN DynAlloc da ON m.employee_id = da.employee_id
        LEFT JOIN employee_master mgr ON p.reporting_manager_id = mgr.employee_id
        WHERE m.employee_id = %s
        """

        cur.execute(employee_query, (employee_id,))
        employee_row = cur.fetchone()

        if not employee_row:
            raise HTTPException(status_code=404, detail="Employee not found")

        columns = [desc[0] for desc in cur.description]
        employee = dict(zip(columns, employee_row))


        # 2️⃣ Fetch Skills
        skills_query = """
        SELECT s.skill_name, es.proficiency_level, es.years_of_experience
        FROM employee_skills es
        JOIN skills s ON es.skill_id = s.skill_id
        WHERE es.employee_id = %s
        """
        cur.execute(skills_query, (employee_id,))
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
        cur.execute(certificates_query, (employee_id,))
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
        cur.execute(projects_query, (employee_id,))
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
            "skills": skills,
            "certificates": certificates,
            "projects": projects
        }

        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=traceback.format_exc())

    finally:
        cur.close()
        release_db_connection(conn)

@router.post("/employees")
def create_employee(emp: EmployeeCreateUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if exists
        cur.execute("SELECT employee_id FROM employee_master WHERE employee_id = %s", (emp.employee_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Employee ID already exists")

        # 1. Insert into employee_master
        phone_digits = "".join(filter(str.isdigit, str(emp.phone))) if emp.phone else ""
        phone_numeric = int(phone_digits) if phone_digits else None
        cur.execute("""
            INSERT INTO employee_master (
                employee_id, employee_name, email_id, phone_number, location,
                mode_of_work, date_of_joining, role_designation, department,
                employee_type, photo_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            emp.employee_id, emp.employee_name, emp.email, phone_numeric, emp.location,
            emp.work_mode, emp.date_of_joining, emp.role_designation, emp.department,
            emp.employment_type, emp.photo_url
        ))

        # 2. Insert into employee_master_pro
        cur.execute("""
            INSERT INTO employee_master_pro (employee_id, employee_status, employee_allocations, reporting_manager_id)
            VALUES (%s, %s, %s, %s)
        """, (emp.employee_id, emp.employee_status, emp.employee_allocations, emp.reporting_manager_id))

        # 3. Handle skills
        for skill_name in emp.skills:
            cur.execute("SELECT skill_id FROM skills WHERE skill_name = %s", (skill_name,))
            skill_row = cur.fetchone()
            if skill_row:
                skill_id = skill_row[0]
            else:
                cur.execute("INSERT INTO skills (skill_name) VALUES (%s) RETURNING skill_id", (skill_name,))
                skill_id = cur.fetchone()[0]
            
            cur.execute("""
                INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience)
                VALUES (%s, %s, 1, 0)
            """, (emp.employee_id, skill_id))

        # 4. Handle projects allocation
        for proj in emp.projects:
            allocation_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO projects_allocation (
                    allocation_id, employee_id, project_id, role_in_project,
                    allocation_percentage, allocation_start_date, allocation_end_date, project_tags
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'billable')
            """, (
                allocation_id, emp.employee_id, proj.project_id, proj.project_role,
                proj.project_allocation, proj.project_start_date, proj.project_end_date
            ))

        # 4b. Sync employee_master_pro allocations from live projects_allocation
        _sync_employee_allocations(cur, [emp.employee_id])

        # 5. Handle certificates
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
                cur.execute("INSERT INTO employee_certificates (employee_id, certificate_id) VALUES (%s, %s)", (emp.employee_id, cert_id))

        conn.commit()
        return {"detail": "Employee created successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)

@router.put("/employees/{employee_id}")
def update_employee(employee_id: str, emp: EmployeeCreateUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT employee_id FROM employee_master WHERE employee_id = %s", (employee_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")

        # 1. Update employee_master
        phone_digits = "".join(filter(str.isdigit, str(emp.phone))) if emp.phone else ""
        phone_numeric = int(phone_digits) if phone_digits else None
        
        # Don't update photo if it wasn't provided (e.g., partial update or huge base64 wasn't sent)
        photo_update_sql = "photo_url = %s," if emp.photo_url else ""
        photo_param = [emp.photo_url] if emp.photo_url else []

        cur.execute(f"""
            UPDATE employee_master SET
                employee_name = %s, email_id = %s, phone_number = %s, location = %s,
                mode_of_work = %s, date_of_joining = %s, role_designation = %s, department = %s,
                employee_type = %s, {photo_update_sql} employee_id = %s
            WHERE employee_id = %s
        """, [
            emp.employee_name, emp.email, phone_numeric, emp.location,
            emp.work_mode, emp.date_of_joining, emp.role_designation, emp.department,
            emp.employment_type
        ] + photo_param + [emp.employee_id, employee_id])

        # 2. Update employee_master_pro
        # First check if exists in pro, if not insert
        cur.execute("SELECT employee_id FROM employee_master_pro WHERE employee_id = %s", (employee_id,))
        if cur.fetchone():
            cur.execute("""
                UPDATE employee_master_pro SET
                    employee_status = %s, employee_allocations = %s, reporting_manager_id = %s, employee_id = %s
                WHERE employee_id = %s
            """, (emp.employee_status, emp.employee_allocations, emp.reporting_manager_id, emp.employee_id, employee_id))
        else:
            cur.execute("""
                INSERT INTO employee_master_pro (employee_id, employee_status, employee_allocations, reporting_manager_id)
                VALUES (%s, %s, %s, %s)
            """, (emp.employee_id, emp.employee_status, emp.employee_allocations, emp.reporting_manager_id))

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
            cur.execute("INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES (%s, %s, 1, 0)", (emp.employee_id, skill_id))

        # 4. Update projects (delete old, insert new)
        cur.execute("DELETE FROM projects_allocation WHERE employee_id = %s", (employee_id,))
        for proj in emp.projects:
            allocation_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO projects_allocation (
                    allocation_id, employee_id, project_id, role_in_project,
                    allocation_percentage, allocation_start_date, allocation_end_date, project_tags
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'billable')
            """, (
                allocation_id, emp.employee_id, proj.project_id, proj.project_role,
                proj.project_allocation, proj.project_start_date, proj.project_end_date
            ))

        # 4b. Sync employee_master_pro allocations from live projects_allocation
        _sync_employee_allocations(cur, [emp.employee_id])

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
                cur.execute("INSERT INTO employee_certificates (employee_id, certificate_id) VALUES (%s, %s)", (emp.employee_id, cert_id))


        conn.commit()
        return {"detail": "Employee updated successfully", "new_id": emp.employee_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)

@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT employee_id FROM employee_master WHERE employee_id = %s", (employee_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")

        # Due to foreign keys, delete dependent records first
        cur.execute("DELETE FROM employee_skills WHERE employee_id = %s", (employee_id,))
        cur.execute("DELETE FROM employee_certificates WHERE employee_id = %s", (employee_id,))
        cur.execute("DELETE FROM projects_allocation WHERE employee_id = %s", (employee_id,))
        cur.execute("DELETE FROM employee_master_pro WHERE employee_id = %s", (employee_id,))
        
        # Finally delete employee
        cur.execute("DELETE FROM employee_master WHERE employee_id = %s", (employee_id,))

        conn.commit()
        return {"detail": "Employee deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get('/employees/allocations/weekly')
def get_all_employee_weekly_allocations():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
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
    except Exception as e:
        print(f"Error fetching weekly allocations: {e}")
        return {}
    finally:
        cur.close()
        release_db_connection(conn)
