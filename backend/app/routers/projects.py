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
        # total projects
        cur.execute("SELECT COUNT(*) FROM projects")
        total = cur.fetchone()[0]

        # ongoing
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(project_status) IN ('running','in progress')
        """)
        ongoing = cur.fetchone()[0]

        # poc
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(project_name) LIKE '%poc%'
        """)
        poc = cur.fetchone()[0]

        # internal
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(billable) = 'no'
        """)
        internal = cur.fetchone()[0]

        # client
        cur.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE LOWER(billable) = 'yes'
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
                project_id,
                project_name,
                project_status,
                billable,
                start_date,
                end_date
            FROM projects
            ORDER BY start_date DESC
        """)

        rows = cur.fetchall()

        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "status": r[2],
                "type": r[3],
                "start_date": r[4],
                "end_date": r[5]
            }
            for r in rows
        ]

    finally:
        cur.close()
        conn.close()


