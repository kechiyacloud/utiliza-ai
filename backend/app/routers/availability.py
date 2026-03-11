from fastapi import APIRouter, HTTPException, Query
from app.database import get_db_connection
from typing import Optional, List

router = APIRouter(prefix="/availability", tags=["Availability"])

@router.get("/all")
def get_all_availability(
    department: Optional[str] = Query(None),
    project: Optional[str] = Query(None)
):
    """
    Returns allocation data for all employees with filtering options.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        query = """
            SELECT 
                em.employee_id,
                em.employee_name,
                em.department,
                p.project_name,
                pa.allocation_percentage,
                pa.allocation_start_date,
                pa.allocation_end_date,
                pa.project_tags
            FROM employee_master em
            LEFT JOIN projects_allocation pa ON em.employee_id = pa.employee_id
            LEFT JOIN projects p ON pa.project_id = p.project_id
            WHERE 1=1
        """
        params = []
        if department:
            query += " AND em.department = %s"
            params.append(department)
        if project:
            query += " AND p.project_name = %s"
            params.append(project)

        query += " ORDER BY em.employee_name"

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        # Group by employee to handle multiple project allocations
        employees = {}
        for row in rows:
            emp_id, emp_name, dept, proj_name, alloc_pct, start_date, end_date, tags = row
            if emp_id not in employees:
                employees[emp_id] = {
                    "employee_id": emp_id,
                    "employee_name": emp_name,
                    "department": dept,
                    "allocations": []
                }
            
            if proj_name:
                employees[emp_id]["allocations"].append({
                    "project_name": proj_name,
                    "allocation_percentage": int(alloc_pct) if alloc_pct is not None else 0,
                    "start_date": start_date,
                    "end_date": end_date,
                    "project_tags": tags
                })

        return list(employees.values())

    except Exception as e:
        print("Availability data DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.get("/filters")
def get_availability_filters():
    """
    Returns unique departments and projects for filtering.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get departments
        cur.execute("SELECT DISTINCT department FROM employee_master WHERE department IS NOT NULL ORDER BY department")
        departments = [row[0] for row in cur.fetchall()]

        # Get projects
        cur.execute("SELECT DISTINCT project_name FROM projects WHERE project_name IS NOT NULL ORDER BY project_name")
        projects = [row[0] for row in cur.fetchall()]

        return {
            "departments": departments,
            "projects": projects
        }

    except Exception as e:
        print("Filters DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
