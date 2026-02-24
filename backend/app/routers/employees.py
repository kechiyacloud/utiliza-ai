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
            SELECT 
                m.employee_id, 
                m.employee_name, 
                m.role_designation, 
                m.department, 
                m.location, 
                m.photo_url,
                p.employee_status, 
                p.employee_allocations
            FROM employee_master m
            LEFT JOIN employee_master_pro p 
            ON m.employee_id = p.employee_id
        """
        cur.execute(query)
        columns = [column[0] for column in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        return results

    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
        
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
            p.employee_status,
            p.employee_allocations,
            p.reporting_manager_id
        FROM employee_master m
        LEFT JOIN employee_master_pro p
        ON m.employee_id = p.employee_id
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
            pa.allocation_end_date
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
                "end_date": row[4]
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
            "employee_allocations": employee.get("employee_allocations"),
            "skills": skills,
            "certificates": certificates,
            "projects": projects
        }

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()
 