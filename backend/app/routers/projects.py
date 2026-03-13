from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection
from pydantic import BaseModel
from datetime import date

from typing import List, Optional

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectDetailsUpdate(BaseModel):
    # Commercial
    budget: Optional[str] = None
    billing_type: Optional[str] = None
    contract_type: Optional[str] = None
    revenue_model: Optional[str] = None
    commercial_notes: Optional[str] = None
    
    # Scope & Timeline
    objective: Optional[str] = None
    deliverables: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    milestones: Optional[str] = None
    timeline_notes: Optional[str] = None

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    billable: Optional[str] = None
    type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class TeamMemberCreate(BaseModel):
    name: str
    role: str
    company: str
    company_type: str
    location: str
    w1: int
    w2: int
    w3: int
    w4: int

class ResourceAllocationUpdate(BaseModel):
    resources: List[TeamMemberCreate]

class ProjectCreate(BaseModel):
    project_id: str
    project_name: str
    project_status: str
    type: str # 'Client', 'Internal', 'Partner'
    billable: Optional[str] = None   # 'Billable' or 'Non - Billable'
    start_date: date
    end_date: Optional[date] = None
    team_members: List[TeamMemberCreate] = []


@router.get("/overview")
def projects_overview():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # total projects
        cur.execute("SELECT COUNT(*) FROM projects")
        total = cur.fetchone()[0]

        # ongoing (Live / In Progress status)
        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_status) IN ('live', 'in progress', 'running', 'active')
        """)
        ongoing = cur.fetchone()[0]

        # partner projects - explicitly set as Partner type
        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(COALESCE(project_type, 'client')) = 'partner'
        """)
        partner = cur.fetchone()[0]

        # completed
        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_status) IN ('completed', 'done', 'ended', 'finished', 'end')
        """)
        completed = cur.fetchone()[0]

        # upcoming
        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_status) = 'planned' OR start_date > CURRENT_DATE
        """)
        upcoming = cur.fetchone()[0]

        # internal - explicitly Internal type
        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(COALESCE(project_type, 'client')) = 'internal'
        """)
        internal = cur.fetchone()[0]

        # client - Client type OR NULL (defaults to Client) AND NOT Internal/Partner
        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(COALESCE(project_type, 'client')) = 'client'
        """)
        client = cur.fetchone()[0]

        return {
            "total_projects": total,
            "internal_projects": internal,
            "client_projects": client,
            "ongoing_projects": ongoing,
            "partner_projects": partner,
            "upcoming_projects": upcoming,
            "completed_projects": completed
        }
    finally:
        cur.close()
        release_db_connection(conn)



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
                p.project_type,
                p.start_date,
                p.end_date,
                COUNT(DISTINCT pa.employee_id) AS resource_count,
                STRING_AGG(DISTINCT em.employee_name, ', ') AS resource_names
            FROM projects p
            LEFT JOIN projects_allocation pa ON p.project_id = pa.project_id
            LEFT JOIN employee_master em ON pa.employee_id = em.employee_id
            GROUP BY p.project_id, p.project_name, p.project_status, p.project_type, p.start_date, p.end_date
            ORDER BY p.start_date DESC NULLS LAST
        """)
        rows = cur.fetchall()

        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "status": "Completed" if r[2] and r[2].lower() in ["ended", "end", "done", "completed"] else (r[2] if r[2] else "Unknown"),
                "type": r[3] or "Client",
                "start_date": r[4],
                "end_date": r[5],
                "resource_count": r[6],
                "resource_names": r[7] if r[7] else ""
            }
            for r in rows
        ]
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/{project_id}/details")
def get_project_details(project_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                project_id, project_name, project_status, billable, start_date, end_date,
                budget, billing_type, contract_type, revenue_model, commercial_notes,
                objective, deliverables, milestones, timeline_notes
            FROM projects
            WHERE project_id = %s
        """, (project_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        return {
            "project_id": row[0],
            "project_name": row[1],
            "project_status": row[2],
            "billable": row[3],
            "start_date": row[4],
            "end_date": row[5],
            "budget": row[6] or "$0",
            "billing_type": row[7] or "Not Set",
            "contract_type": row[8] or "Not Set",
            "revenue_model": row[9] or "Not Set",
            "commercial_notes": row[10] or "No notes.",
            "objective": row[11] or "Not defined.",
            "deliverables": row[12] or "No deliverables listed.",
            "milestones": row[13] or "No milestones listed.",
            "timeline_notes": row[14] or "No timeline notes."
        }
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{project_id}/details")
def update_project_details(project_id: str, details: ProjectDetailsUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verify exists
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Start date/end date from the payload could be empty strings or 'Not Set'. 
        start_date_val = None if not details.start_date or details.start_date in ['Not Set', 'TBD'] else details.start_date
        end_date_val = None if not details.end_date or details.end_date in ['Not Set', 'TBD'] else details.end_date

        cur.execute("""
            UPDATE projects SET
                budget = %s,
                billing_type = %s,
                contract_type = %s,
                revenue_model = %s,
                commercial_notes = %s,
                objective = %s,
                deliverables = %s,
                start_date = COALESCE(%s, start_date),
                end_date = COALESCE(%s, end_date),
                milestones = %s,
                timeline_notes = %s
            WHERE project_id = %s
        """, (
            details.budget, details.billing_type, details.contract_type,
            details.revenue_model, details.commercial_notes,
            details.objective, details.deliverables,
            start_date_val, end_date_val,
            details.milestones, details.timeline_notes,
            project_id
        ))
        
        conn.commit()
        return {"message": "Project details updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/{project_id}/resources")
def project_resources(project_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT
                em.employee_name,
                em.role_designation,
                em.location,
                em.employee_id,
                pa.w1, pa.w2, pa.w3, pa.w4
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.project_id = %s
            ORDER BY em.employee_name
        """, (project_id,))
        rows = cur.fetchall()
        return [
            {
                "employee_id": r[3],
                "name": r[0] if r[0] else "Unknown Resource",
                "role": r[1] if r[1] else "Team Member",
                "company": "Cloud Destinations",
                "location": r[2] if r[2] else "Remote",
                "w1": r[4] or 0, 
                "w2": r[5] or 0, 
                "w3": r[6] or 0, 
                "w4": r[7] or 0,
            }
            for r in rows
        ]
    finally:
        cur.close()
        release_db_connection(conn)

@router.put("/{project_id}/resources")
def update_project_resources(project_id: str, payload: ResourceAllocationUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if project exists
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Delete existing allocations
        cur.execute("DELETE FROM projects_allocation WHERE project_id = %s", (project_id,))

        # Auto-create allocation records for each team member
        for idx, tm in enumerate(payload.resources):
            # Try to find matching employee by name (case-insensitive)
            cur.execute("""
                SELECT employee_id FROM employee_master
                WHERE LOWER(employee_name) = LOWER(%s)
                LIMIT 1
            """, (tm.name,))
            emp_row = cur.fetchone()

            if emp_row:
                employee_id = emp_row[0]
                avg_hours = (tm.w1 + tm.w2 + tm.w3 + tm.w4) / 4 if any([tm.w1, tm.w2, tm.w3, tm.w4]) else 0
                allocation_pct = min(100, int((avg_hours / 40) * 100))
                allocation_id = f"AL-{project_id}-{idx + 1:03d}"

                project_tag = "Billable" if tm.company_type == "Internal" else "Non-Billable"

                try:
                    cur.execute("""
                        INSERT INTO projects_allocation (
                            allocation_id, employee_id, project_id,
                            role_in_project, allocation_percentage,
                            project_tags, w1, w2, w3, w4
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        allocation_id,
                        employee_id,
                        project_id,
                        tm.role,
                        allocation_pct,
                        project_tag,
                        tm.w1, tm.w2, tm.w3, tm.w4
                    ))
                except Exception as alloc_err:
                    print(f"Allocation insert error for {tm.name}: {alloc_err}")
            else:
                print(f"Team member '{tm.name}' not found - skipping allocation")

        conn.commit()
        return {"message": "Project resources updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)

@router.put("/{project_id}")
def update_project(project_id: str, updates: ProjectUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Prepare updates
        fields = []
        values = []

        if updates.project_name is not None:
            fields.append("project_name = %s")
            values.append(updates.project_name)
        if updates.project_status is not None:
            fields.append("project_status = %s")
            values.append(updates.project_status)
        if updates.billable is not None:
             fields.append("billable = %s")
             values.append(updates.billable)
        if updates.type is not None:
             fields.append("project_type = %s")
             values.append(updates.type)
        if updates.start_date is not None:
             fields.append("start_date = %s")
             values.append(updates.start_date)
        if updates.end_date is not None:
             fields.append("end_date = %s")
             values.append(updates.end_date)

        if not fields:
             return {"message": "No fields to update"}

        values.append(project_id)
        query = f"UPDATE projects SET {', '.join(fields)} WHERE project_id = %s"
        
        cur.execute(query, tuple(values))
        conn.commit()
        
        return {"message": "Project updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("")
def create_project(project: ProjectCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO projects (
                project_id, project_name, project_status, project_type, billable, start_date, end_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            project.project_id,
            project.project_name,
            project.project_status,
            project.type,
            project.billable,
            project.start_date,
            project.end_date
        ))

        # Auto-create allocation records for each team member
        if project.team_members:
            for idx, tm in enumerate(project.team_members):
                # Try to find matching employee by name (case-insensitive)
                cur.execute("""
                    SELECT employee_id FROM employee_master
                    WHERE LOWER(employee_name) = LOWER(%s)
                    LIMIT 1
                """, (tm.name,))
                emp_row = cur.fetchone()

                if emp_row:
                    employee_id = emp_row[0]
                    # Calculate approximate allocation % from weekly hours (40h = 100%)
                    avg_hours = (tm.w1 + tm.w2 + tm.w3 + tm.w4) / 4 if any([tm.w1, tm.w2, tm.w3, tm.w4]) else 0
                    allocation_pct = min(100, int((avg_hours / 40) * 100))

                    allocation_id = f"AL-{project.project_id}-{idx + 1:03d}"

                    # Determine project_tags from company_type
                    project_tag = "Billable" if tm.company_type == "Internal" else "Non-Billable"
                    if project.billable and "non" not in project.billable.lower():
                        project_tag = "Billable"

                    try:
                        cur.execute("""
                            INSERT INTO projects_allocation (
                                allocation_id, employee_id, project_id,
                                role_in_project, allocation_percentage,
                                allocation_start_date, allocation_end_date,
                                project_tags
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            allocation_id,
                            employee_id,
                            project.project_id,
                            tm.role,
                            allocation_pct,
                            project.start_date,
                            project.end_date,
                            project_tag
                        ))
                    except Exception as alloc_err:
                        # Log but don't block project creation
                        print(f"Allocation insert skipped for {tm.name}: {alloc_err}")
                else:
                    print(f"Team member '{tm.name}' not found in employee_master — skipping allocation")

        conn.commit()
        return {"message": "Project created successfully", "project_id": project.project_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.delete("/{project_id}")
def delete_project(project_id: str):
    import psycopg2.errors
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if project exists first
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Try to delete the main project
        # We rely on PostgreSQL's constraint rules here. If child records
        # exist without ON DELETE CASCADE, this will throw an IntegrityError.
        cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))
            
        conn.commit()
        return {"message": "Project deleted successfully"}
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(
            status_code=400, 
            detail="This project cannot be deleted because resources are still allocated to it. Please remove all resource allocations first."
        )
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
