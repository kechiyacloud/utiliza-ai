from datetime import date, datetime
from typing import List, Optional

import psycopg2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db_connection

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectDetailsUpdate(BaseModel):
    budget: Optional[str] = None
    billing_type: Optional[str] = None
    contract_type: Optional[str] = None
    revenue_model: Optional[str] = None
    commercial_notes: Optional[str] = None
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
    client: Optional[str] = None
    client_id: Optional[int] = None
    partner: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class TeamMemberCreate(BaseModel):
    name: str
    role: str
    department: Optional[str] = None
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
    type: str
    client_id: Optional[int] = None
    client: Optional[str] = None
    partner: Optional[str] = None
    billable: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    team_members: List[TeamMemberCreate] = []


VALID_PROJECT_TYPES = {"client", "internal", "partner", "poc"}
VALID_BILLABLE_VALUES = {"billable", "non-billable", "non billable", "non - billable"}
PROJECT_STATUS_ALIASES = {
    "not started": "Not Started",
    "planned": "Not Started",
    "upcoming": "Not Started",
    "in progress": "In Progress",
    "running": "In Progress",
    "live": "In Progress",
    "active": "In Progress",
    "ongoing": "In Progress",
    "on hold": "On Hold",
    "delayed": "On Hold",
    "blocked": "On Hold",
    "closed": "Completed",
    "completed": "Completed",
    "done": "Completed",
    "ended": "Completed",
    "end": "Completed",
    "finished": "Completed",
}
VALID_PROJECT_STATUSES = {"Not Started", "In Progress", "On Hold", "Completed"}
PROJECT_TYPE_ALIASES = {
    "client": "Client",
    "internal": "Internal",
    "partner": "Partner",
    "poc": "POC",
}


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _parse_optional_date(value: Optional[str]):
    value = _normalize_text(value)
    if not value or value in {"Not Set", "TBD"}:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid date format '{value}'. Expected YYYY-MM-DD.") from exc


def _normalize_project_status(value: Optional[str], strict: bool = True) -> Optional[str]:
    normalized = _normalize_text(value)
    if not normalized:
        if strict:
            raise HTTPException(status_code=422, detail="Project status is required.")
        return None

    key = " ".join(normalized.lower().split())
    canonical = PROJECT_STATUS_ALIASES.get(key)
    if canonical:
        return canonical

    if strict:
        allowed = ", ".join(sorted(VALID_PROJECT_STATUSES))
        raise HTTPException(status_code=422, detail=f"Project status must be one of: {allowed}.")
    return normalized


def _normalize_project_type(value: Optional[str], strict: bool = True) -> Optional[str]:
    normalized = _normalize_text(value)
    if not normalized:
        if strict:
            raise HTTPException(status_code=422, detail="Project type is required.")
        return None

    key = " ".join(normalized.lower().replace("_", " ").split())
    if key in PROJECT_TYPE_ALIASES:
        return PROJECT_TYPE_ALIASES[key]

    if strict:
        raise HTTPException(status_code=422, detail="Project type must be Client, Internal, Partner, or POC.")
    return normalized


def _validate_project_dates(start_date_value, end_date_value):
    if start_date_value and end_date_value and end_date_value < start_date_value:
        raise HTTPException(status_code=422, detail="End date cannot be earlier than start date.")


def _validate_resource_rows(resources: List[TeamMemberCreate]):
    seen_names = set()
    for idx, resource in enumerate(resources, start=1):
        name = _normalize_text(resource.name)
        role = _normalize_text(resource.role)
        if not name:
            raise HTTPException(status_code=422, detail=f"Resource row {idx}: name is required.")
        if not role:
            raise HTTPException(status_code=422, detail=f"Resource row {idx}: role is required.")

        normalized_name = name.lower()
        if normalized_name in seen_names:
            raise HTTPException(status_code=422, detail=f"Resource row {idx}: duplicate resource '{name}'.")
        seen_names.add(normalized_name)

        for week_field in ("w1", "w2", "w3", "w4"):
            hours = getattr(resource, week_field)
            if hours < 0 or hours > 168:
                raise HTTPException(status_code=422, detail=f"Resource row {idx}: {week_field} must be between 0 and 168.")


def _model_payload(model):
    return model.model_dump(exclude_unset=True) if hasattr(model, "model_dump") else model.dict(exclude_unset=True)


@router.get("/overview")
def projects_overview():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM projects")
        total = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_status) IN ('live', 'in progress', 'running', 'active', 'ongoing')
        """)
        ongoing = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_status) IN ('closed', 'completed', 'done', 'ended', 'finished', 'end')
        """)
        completed = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_status) IN ('not started', 'planned', 'upcoming') OR start_date > CURRENT_DATE
        """)
        upcoming = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_type) IN ('internal', 'poc')
        """)
        internal = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM projects
            WHERE LOWER(project_type) = 'client'
        """)
        client = cur.fetchone()[0]

        return {
            "total_projects": total,
            "internal_projects": internal,
            "client_projects": client,
            "ongoing_projects": ongoing,
            "upcoming_projects": upcoming,
            "completed_projects": completed,
        }
    except Exception as e:
        print("PROJECTS OVERVIEW ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
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
                p.project_type,
                p.start_date,
                p.end_date,
                COUNT(DISTINCT pa.employee_id) AS resource_count,
                STRING_AGG(DISTINCT em.employee_name, ', ') AS resource_names,
                p.client_name,
                p.billable,
                p.client_id
            FROM projects p
            LEFT JOIN projects_allocation pa ON p.project_id = pa.project_id
            LEFT JOIN employee_master em ON pa.employee_id = em.employee_id
            GROUP BY p.project_id, p.project_name, p.project_status, p.project_type, p.start_date, p.end_date, p.client_name, p.billable, p.client_id
            ORDER BY p.start_date DESC NULLS LAST
        """)
        rows = cur.fetchall()

        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "status": _normalize_project_status(r[2], strict=False) if r[2] else "Unknown",
                "type": _normalize_project_type(r[3], strict=False) if r[3] else "Unknown",
                "start_date": r[4],
                "end_date": r[5],
                "resource_count": r[6],
                "resource_names": r[7] if r[7] else "",
                "client_name": r[8],
                "billable": r[9] if r[9] else "Unknown",
                "client_id": r[10],
            }
            for r in rows
        ]
    except Exception as e:
        print("PROJECTS LIST ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


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
            "project_status": _normalize_project_status(row[2], strict=False) if row[2] else None,
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
            "timeline_notes": row[14] or "No timeline notes.",
        }
    finally:
        cur.close()
        conn.close()


@router.put("/{project_id}/details")
def update_project_details(project_id: str, details: ProjectDetailsUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        payload = _model_payload(details)
        if not payload:
            raise HTTPException(status_code=400, detail="No project detail fields were provided.")

        field_map = {
            "budget": "budget",
            "billing_type": "billing_type",
            "contract_type": "contract_type",
            "revenue_model": "revenue_model",
            "commercial_notes": "commercial_notes",
            "objective": "objective",
            "deliverables": "deliverables",
            "milestones": "milestones",
            "timeline_notes": "timeline_notes",
        }
        fields = []
        values = []

        start_date_val = _parse_optional_date(payload["start_date"]) if "start_date" in payload else None
        end_date_val = _parse_optional_date(payload["end_date"]) if "end_date" in payload else None
        _validate_project_dates(start_date_val, end_date_val)

        for api_field, db_field in field_map.items():
            if api_field in payload:
                fields.append(f"{db_field} = %s")
                values.append(_normalize_text(payload[api_field]))

        if "start_date" in payload:
            fields.append("start_date = %s")
            values.append(start_date_val)
        if "end_date" in payload:
            fields.append("end_date = %s")
            values.append(end_date_val)

        if not fields:
            raise HTTPException(status_code=400, detail="No valid project detail fields were provided.")

        values.append(project_id)
        cur.execute(f"UPDATE projects SET {', '.join(fields)} WHERE project_id = %s", tuple(values))
        conn.commit()
        return {"message": "Project details updated successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


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
                em.department,
                pa.w1, pa.w2, pa.w3, pa.w4,
                (
                    SELECT COUNT(DISTINCT pa2.project_id)
                    FROM projects_allocation pa2
                    WHERE pa2.employee_id = pa.employee_id
                ) AS project_count
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
                "department": r[4] if r[4] else "Not Set",
                "company": "Cloud Destinations",
                "location": r[2] if r[2] else "Remote",
                "w1": r[5] or 0,
                "w2": r[6] or 0,
                "w3": r[7] or 0,
                "w4": r[8] or 0,
                "project_count": r[9] or 1,
            }
            for r in rows
        ]
    finally:
        cur.close()
        conn.close()


@router.put("/{project_id}/resources")
def update_project_resources(project_id: str, payload: ResourceAllocationUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT billable, start_date, end_date FROM projects WHERE project_id = %s", (project_id,))
        project_row = cur.fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        _validate_resource_rows(payload.resources)

        project_billable = (project_row[0] or "").lower()
        project_start_date = project_row[1]
        project_end_date = project_row[2]

        cur.execute("DELETE FROM projects_allocation WHERE project_id = %s", (project_id,))

        for idx, tm in enumerate(payload.resources):
            cur.execute("""
                SELECT employee_id FROM employee_master
                WHERE LOWER(employee_name) = LOWER(%s)
                LIMIT 1
            """, (_normalize_text(tm.name),))
            emp_row = cur.fetchone()
            if not emp_row:
                raise HTTPException(status_code=422, detail=f"Resource '{tm.name}' does not exist in employee_master.")

            employee_id = emp_row[0]
            avg_hours = (tm.w1 + tm.w2 + tm.w3 + tm.w4) / 4 if any([tm.w1, tm.w2, tm.w3, tm.w4]) else 0
            allocation_pct = min(100, int((avg_hours / 40) * 100))
            allocation_id = f"AL-{project_id}-{idx + 1:03d}"
            project_tag = "Billable" if "non" not in project_billable else "Non-Billable"

            cur.execute("""
                INSERT INTO projects_allocation (
                    allocation_id, employee_id, project_id,
                    role_in_project, allocation_percentage,
                    allocation_start_date, allocation_end_date,
                    project_tags, w1, w2, w3, w4
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                allocation_id,
                employee_id,
                project_id,
                _normalize_text(tm.role) or "Team Member",
                allocation_pct,
                project_start_date,
                project_end_date,
                project_tag,
                tm.w1, tm.w2, tm.w3, tm.w4,
            ))

        conn.commit()
        return {"message": "Project resources updated successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.put("/{project_id}")
def update_project(project_id: str, updates: ProjectUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        payload = _model_payload(updates)
        if not payload:
            raise HTTPException(status_code=400, detail="No project fields were provided.")

        fields = []
        values = []

        start_date_value = payload.get("start_date")
        end_date_value = payload.get("end_date")
        _validate_project_dates(start_date_value, end_date_value)

        if "project_name" in payload:
            project_name = _normalize_text(payload["project_name"])
            if not project_name:
                raise HTTPException(status_code=422, detail="Project name cannot be empty.")
            fields.append("project_name = %s")
            values.append(project_name)
        if "project_status" in payload:
            fields.append("project_status = %s")
            values.append(_normalize_project_status(payload["project_status"]))
        if "billable" in payload:
            billable = _normalize_text(payload["billable"])
            if billable and billable.lower() not in VALID_BILLABLE_VALUES:
                raise HTTPException(status_code=422, detail="Billable must be either Billable or Non-Billable.")
            fields.append("billable = %s")
            values.append(billable)
        if "type" in payload:
            project_type = _normalize_project_type(payload["type"])
            fields.append("project_type = %s")
            values.append(project_type)
        if "start_date" in payload:
            fields.append("start_date = %s")
            values.append(start_date_value)
        if "end_date" in payload:
            fields.append("end_date = %s")
            values.append(end_date_value)
        if "client" in payload:
            fields.append("client_name = %s")
            values.append(_normalize_text(payload["client"]))
        if "partner" in payload:
            fields.append("client_name = %s")
            values.append(_normalize_text(payload["partner"]))
        if "client_id" in payload:
            fields.append("client_id = %s")
            values.append(payload["client_id"])
        if not fields:
            raise HTTPException(status_code=400, detail="No valid project fields were provided.")

        values.append(project_id)
        cur.execute(f"UPDATE projects SET {', '.join(fields)} WHERE project_id = %s", tuple(values))
        conn.commit()
        return {"message": "Project updated successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("")
def create_project(project: ProjectCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_name = _normalize_text(project.project_name)
        if not project_name:
            raise HTTPException(status_code=422, detail="Project name is required.")
        project_type = _normalize_project_type(project.type)
        if project.billable and project.billable.lower() not in VALID_BILLABLE_VALUES:
            raise HTTPException(status_code=422, detail="Billable must be either Billable or Non-Billable.")
        if project_type.lower() == "client" and not _normalize_text(project.client):
            raise HTTPException(status_code=422, detail="Client projects must include a client name.")
        if project_type.lower() == "partner" and not _normalize_text(project.partner):
            raise HTTPException(status_code=422, detail="Partner projects must include a partner name.")
        project_status = _normalize_project_status(project.project_status)

        _validate_project_dates(project.start_date, project.end_date)
        _validate_resource_rows(project.team_members)

        cur.execute("""
            INSERT INTO projects (
                project_id, project_name, project_status, project_type, billable, client_name, client_id, start_date, end_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            project.project_id,
            project_name,
            project_status,
            project_type,
            _normalize_text(project.billable),
            _normalize_text(project.client) if project_type.lower() == "client" else _normalize_text(project.partner),
            project.client_id,
            project.start_date,
            project.end_date,
        ))

        for idx, tm in enumerate(project.team_members):
            cur.execute("""
                SELECT employee_id FROM employee_master
                WHERE LOWER(employee_name) = LOWER(%s)
                LIMIT 1
            """, (_normalize_text(tm.name),))
            emp_row = cur.fetchone()
            if not emp_row:
                raise HTTPException(status_code=422, detail=f"Team member '{tm.name}' does not exist in employee_master.")

            employee_id = emp_row[0]
            avg_hours = (tm.w1 + tm.w2 + tm.w3 + tm.w4) / 4 if any([tm.w1, tm.w2, tm.w3, tm.w4]) else 0
            allocation_pct = min(100, int((avg_hours / 40) * 100))
            allocation_id = f"AL-{project.project_id}-{idx + 1:03d}"

            project_tag = "Billable" if tm.company_type == "Internal" else "Non-Billable"
            if project.billable and "non" not in project.billable.lower():
                project_tag = "Billable"

            cur.execute("""
                INSERT INTO projects_allocation (
                    allocation_id, employee_id, project_id,
                    role_in_project, allocation_percentage,
                    allocation_start_date, allocation_end_date,
                    project_tags, w1, w2, w3, w4
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                allocation_id,
                employee_id,
                project.project_id,
                _normalize_text(tm.role) or "Team Member",
                allocation_pct,
                project.start_date,
                project.end_date,
                project_tag,
                tm.w1, tm.w2, tm.w3, tm.w4,
            ))

        conn.commit()
        return {"message": "Project created successfully", "project_id": project.project_id}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail=f"Project ID '{project.project_id}' already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.delete("/{project_id}")
def delete_project(project_id: str):
    import psycopg2.errors

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        cur.execute("DELETE FROM projects WHERE project_id = %s", (project_id,))

        conn.commit()
        return {"message": "Project deleted successfully"}
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail="This project cannot be deleted because resources are still allocated to it. Please remove all resource allocations first.",
        )
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
