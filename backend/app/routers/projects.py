from fastapi import APIRouter, HTTPException
from app.database import get_db_connection
from pydantic import BaseModel
from datetime import date


router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    project_id: str
    project_name: str
    project_status: str
    billable: str
    start_date: date
    end_date: date | None = None


@router.get("/overview")
def projects_overview():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Helper for common filter
        status_filter = "WHERE LOWER(project_status) NOT LIKE '%end%'"
        
        # total projects
        cur.execute(f"SELECT COUNT(*) FROM projects {status_filter}")
        total = cur.fetchone()[0]

        # ongoing
        cur.execute(f"""
            SELECT COUNT(*)
            FROM projects
            {status_filter} AND LOWER(project_status) IN ('running','in progress','live','active')
        """)
        ongoing = cur.fetchone()[0]

        # poc
        cur.execute(f"""
            SELECT COUNT(*)
            FROM projects
            {status_filter} AND LOWER(project_name) LIKE '%poc%'
        """)
        poc = cur.fetchone()[0]

        # internal
        cur.execute(f"""
            SELECT COUNT(*)
            FROM projects
            {status_filter} AND (LOWER(billable) LIKE '%non%' OR LOWER(billable) = 'no')
        """)
        internal = cur.fetchone()[0]

        # client
        cur.execute(f"""
            SELECT COUNT(*)
            FROM projects
            {status_filter} AND (LOWER(billable) LIKE '%billable%' AND LOWER(billable) NOT LIKE '%non%' OR LOWER(billable) = 'yes')
        """)
        client = cur.fetchone()[0]

        return {
            "total_projects": total,
            "internal_projects": internal,
            "client_projects": client,
            "ongoing_projects": ongoing,
            "poc_projects": poc
        }

    finally:
        cur.close()
        conn.close()
@router.get("/list")
def projects_list():

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                p.project_id,
                p.project_name,
                p.project_status,
                p.billable,
                p.start_date,
                p.end_date,
                COUNT(pa.employee_id) AS resource_count,
                STRING_AGG(DISTINCT em.employee_name, ', ') AS resource_names
            FROM projects p
            LEFT JOIN projects_allocation pa ON p.project_id = pa.project_id
            LEFT JOIN employee_master em ON pa.employee_id = em.employee_id
            GROUP BY p.project_id
            ORDER BY p.start_date DESC
        """)

        rows = cur.fetchall()

        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "status": r[2],
                "type": r[3],
                "start_date": r[4],
                "end_date": r[5],
                "resource_count": r[6],
                "resource_names": r[7] if r[7] else ""
            }
            for r in rows
        ]

    finally:
        cur.close()
        conn.close()


@router.post("")
def create_project(proj: ProjectCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (proj.project_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Project ID already exists")

        cur.execute("""
            INSERT INTO projects (project_id, project_name, project_status, billable, start_date, end_date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (proj.project_id, proj.project_name, proj.project_status, proj.billable, proj.start_date, proj.end_date))
        
        conn.commit()
        return {"detail": "Project created successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.put("/{project_id}")
def update_project(project_id: str, proj: ProjectCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        cur.execute("""
            UPDATE projects SET
                project_id = %s, project_name = %s, project_status = %s,
                billable = %s, start_date = %s, end_date = %s
            WHERE project_id = %s
        """, (proj.project_id, proj.project_name, proj.project_status, proj.billable, proj.start_date, proj.end_date, project_id))
        
        conn.commit()
        return {"detail": "Project updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.delete("/{project_id}")
def delete_project(project_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Due to foreign keys, delete dependent records
        cur.execute("DELETE FROM projects_allocation WHERE project_id = %s", (project_id,))
        
        # Finally delete project
        cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))

        conn.commit()
        return {"detail": "Project deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
