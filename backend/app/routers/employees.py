from fastapi import APIRouter, HTTPException
from app.database import get_db_connection

router = APIRouter()

@router.post("/employee/count")
def get_total_employee_count():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM employee_master")
        count = cur.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error fetching employee count: {e}")
        return 0 
    finally:
        cur.close()
        conn.close()

@router.post("/employee/bench")
def get_bench_employee_count():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM employee_master_pro WHERE employee_status = 'Bench'")
        count = cur.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error fetching bench employee count: {e}")
        return 0
    finally:
        cur.close()
        conn.close()

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
        conn.close()

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
                    WHEN COALESCE(p.employee_allocations, 0) <= 0 THEN 'Bench'
                    WHEN COALESCE(p.employee_allocations, 0) BETWEEN 1 AND 40 THEN 'Partially bench'
                    WHEN COALESCE(p.employee_allocations, 0) BETWEEN 41 AND 80 THEN 'Partially allocated'
                    WHEN COALESCE(p.employee_allocations, 0) >= 81 THEN 'Allocated'
                    ELSE p.employee_status 
                END as employee_status, 
                CASE 
                    WHEN ap.priority_rank = 3 THEN 'billable'
                    WHEN ap.priority_rank = 2 THEN 'non-billable'
                    WHEN ap.priority_rank = 1 THEN 'billable'
                    ELSE 'non-billable' 
                END as billable,
                p.employee_allocations,
                ARRAY_AGG(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL) as skills
            FROM employee_master m
            LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
            LEFT JOIN AllocationPriority ap ON m.employee_id = ap.employee_id
            LEFT JOIN employee_skills es ON m.employee_id = es.employee_id
            LEFT JOIN skills s ON es.skill_id = s.skill_id
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
                p.employee_allocations
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
        conn.close()

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
        conn.close()

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
        conn.close()

@router.get("/employees/employee-of-month")
def fetch_employee_of_month():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Find an employee with highest allocation. If no one has allocation > 0, return nothing.
        query = """
            SELECT 
                m.employee_id,
                m.employee_name,
                m.role_designation,
                m.photo_url,
                p.employee_allocations
            FROM employee_master m
            JOIN employee_master_pro p ON m.employee_id = p.employee_id
            WHERE p.employee_allocations IS NOT NULL 
              AND p.employee_allocations > 0
              AND m.date_of_resign IS NULL
            ORDER BY p.employee_allocations DESC, m.date_of_joining ASC
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
        conn.close()

@router.get("/employees/action-inbox")
def fetch_action_inbox():
    conn = get_db_connection()
    cur = conn.cursor()
    tasks = []
    task_id_counter = 1
    
    try:
        # Dynamic Task 1: Find employees on notice period (requires exit interview)
        notice_query = """
            SELECT employee_name, department
            FROM employee_master 
            WHERE date_of_resign IS NOT NULL 
              AND employee_status != 'Exited'
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
        conn.close()
        
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
        conn.close()

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
                WHEN COALESCE(p.employee_allocations, 0) <= 0 THEN 'Bench'
                WHEN COALESCE(p.employee_allocations, 0) BETWEEN 1 AND 40 THEN 'Partially bench'
                WHEN COALESCE(p.employee_allocations, 0) BETWEEN 41 AND 80 THEN 'Partially allocated'
                WHEN COALESCE(p.employee_allocations, 0) >= 81 THEN 'Allocated'
                ELSE p.employee_status 
            END as employee_status,
            CASE 
                WHEN ap.priority_rank = 3 THEN 'billable'
                WHEN ap.priority_rank = 2 THEN 'non-billable'
                WHEN ap.priority_rank = 1 THEN 'billable'
                ELSE 'non-billable' 
            END as billable,
            p.employee_allocations,
            p.reporting_manager_id
        FROM employee_master m
        LEFT JOIN employee_master_pro p ON m.employee_id = p.employee_id
        LEFT JOIN AllocationPriority ap ON m.employee_id = ap.employee_id
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


        # 4️⃣ Fetch Projects & Allocations
        projects_query = """
        SELECT 
            p.project_name,
            pa.role_in_project,
            pa.allocation_percentage,
            pa.allocation_start_date,
            pa.allocation_end_date,
            p.project_status,
            pa.project_tags
        FROM projects_allocation pa
        JOIN projects p 
        ON pa.project_id = p.project_id
        WHERE pa.employee_id = %s
        """
        cur.execute(projects_query, (employee_id,))
        project_rows = cur.fetchall()

        projects = [
            {
                "project_name": row[0],
                "role": row[1],
                "allocation_percentage": row[2],
                "start_date": row[3],
                "end_date": row[4],
                "status": row[5],
                "billable": row[6]
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
            "reporting_manager": employee.get("reporting_manager_id"),
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
        conn.close()
 