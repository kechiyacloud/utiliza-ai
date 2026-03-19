from datetime import date, datetime
from typing import List, Optional

import psycopg2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db_connection, release_db_connection

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
    employee_id: Optional[str] = None
    name: str
    role: str
    department: Optional[str] = None
    company: Optional[str] = "Cloud Destinations"
    company_type: Optional[str] = "Internal"
    location: Optional[str] = "Remote"
    allocation_start_date: Optional[str] = None
    allocation_end_date: Optional[str] = None
    w1: int = 0
    w2: int = 0
    w3: int = 0
    w4: int = 0


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
                STRING_AGG(DISTINCT em.employee_name, ', ') AS resource_names,
                c.client_name,
                p.billable,
                p.client_id
            FROM projects p
            LEFT JOIN projects_allocation pa ON p.project_id = pa.project_id
            LEFT JOIN employee_master em ON pa.employee_id = em.employee_id
            LEFT JOIN clients c ON p.client_id = c.client_id
            GROUP BY p.project_id, p.project_name, p.project_status, p.project_type, p.start_date, p.end_date, c.client_name, p.billable, p.client_id
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
        release_db_connection(conn)


@router.get("/{project_id}/details")
def get_project_details(project_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                p.project_id, p.project_name, p.project_status, p.billable, p.start_date, p.end_date,
                pc.budget, pc.billing_type, pc.contract_type, pc.revenue_model, pc.commercial_notes,
                ps.objective, ps.deliverables, ps.milestones, ps.timeline_notes
            FROM projects p
            LEFT JOIN project_commercials pc ON p.project_id = pc.project_id
            LEFT JOIN project_scopes ps ON p.project_id = ps.project_id
            WHERE p.project_id = %s
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
        release_db_connection(conn)


@router.put("/{project_id}/details")
def update_project_details(project_id: str, details: ProjectDetailsUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT project_name, client_id FROM projects WHERE project_id = %s", (project_id,))
        proj_row = cur.fetchone()
        if not proj_row:
            raise HTTPException(status_code=404, detail="Project not found")
            
        project_name = proj_row[0]
        client_id = proj_row[1]

        start_date_val = None if not details.start_date or details.start_date in ['Not Set', 'TBD'] else details.start_date
        end_date_val = None if not details.end_date or details.end_date in ['Not Set', 'TBD'] else details.end_date

        # Update core projects
        cur.execute("""
            UPDATE projects SET
                start_date = COALESCE(%s, start_date),
                end_date = COALESCE(%s, end_date)
            WHERE project_id = %s
        """, (start_date_val, end_date_val, project_id))
        
        # Replace commercial details
        cur.execute("DELETE FROM project_commercials WHERE project_id = %s", (project_id,))
        cur.execute("""
            INSERT INTO project_commercials (project_id, project_name, client_id, budget, billing_type, contract_type, revenue_model, commercial_notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (project_id, project_name, client_id, details.budget, details.billing_type, details.contract_type, details.revenue_model, details.commercial_notes))
        
        # Replace scope details
        cur.execute("DELETE FROM project_scopes WHERE project_id = %s", (project_id,))
        cur.execute("""
            INSERT INTO project_scopes (project_id, objective, deliverables, milestones, timeline_notes)
            VALUES (%s, %s, %s, %s, %s)
        """, (project_id, details.objective, details.deliverables, details.milestones, details.timeline_notes))
        
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
        release_db_connection(conn)


@router.get("/{project_id}/resources")
def project_resources(project_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Fetch all resources and their weekly allocations in one go
        cur.execute("""
            SELECT
                em.employee_name,
                em.role_designation,
                em.location,
                em.employee_id,
                pa.allocation_id,
                pa.allocation_start_date,
                pa.allocation_end_date,
                pa.allocation_percentage,
                wa.week_number,
                COALESCE(wa.allocated_hours, 0)
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            LEFT JOIN weekly_allocations wa ON pa.allocation_id = wa.allocation_id
            WHERE pa.project_id = %s
            ORDER BY em.employee_name, wa.week_number
        """, (project_id,))
        rows = cur.fetchall()
        
        import datetime
        today = datetime.date.today()
        # Get Monday of the current week
        monday = today - datetime.timedelta(days=today.weekday())
        
        # Calculate the 4 target ISO week numbers
        target_weeks = []
        for i in range(3, -1, -1):
            target_date = monday - datetime.timedelta(weeks=i)
            target_weeks.append(target_date.isocalendar()[1])
        
        # Mapping from absolute week number to UI slot (w1..w4)
        week_to_slot = { week: f"w{i+1}" for i, week in enumerate(target_weeks) }

        # Group allocations by employee
        resources_dict = {}
        for r in rows:
            emp_id = r[3]
            if emp_id not in resources_dict:
                resources_dict[emp_id] = {
                    "employee_id": emp_id,
                    "name": r[0] if r[0] else "Unknown Resource",
                    "role": r[1] if r[1] else "Team Member",
                    "company": "Cloud Destinations",
                    "location": r[2] if r[2] else "Remote",
                    "allocation_start_date": str(r[5]) if r[5] else None,
                    "allocation_end_date": str(r[6]) if r[6] else None,
                    "allocation_percentage": r[7] or 0,
                    "w1": 0.0, "w2": 0.0, "w3": 0.0, "w4": 0.0,
                    "_has_weekly_data": False,
                }

            week_num = r[8]
            hours = float(r[9]) if (r[9] is not None) else 0.0
            if week_num is not None and week_num in week_to_slot and hours > 0:
                resources_dict[emp_id][week_to_slot[week_num]] = hours
                resources_dict[emp_id]["_has_weekly_data"] = True

        # ── Dynamic calculation for employees with no stored weekly data ────
        # For each such employee, count how many active projects they are on
        # and divide 40h equally across those projects.
        emp_ids_needing_calc = [
            eid for eid, rec in resources_dict.items() if not rec["_has_weekly_data"]
        ]

        if emp_ids_needing_calc:
            placeholders = ",".join(["%s"] * len(emp_ids_needing_calc))
            cur.execute(f"""
                SELECT pa.employee_id, COUNT(DISTINCT pa.project_id) AS active_count
                FROM projects_allocation pa
                JOIN projects p ON pa.project_id = p.project_id
                WHERE pa.employee_id IN ({placeholders})
                  AND LOWER(p.project_status) NOT IN (
                      'completed', 'closed', 'ended', 'end', 'done', 'cancelled'
                  )
                GROUP BY pa.employee_id
            """, emp_ids_needing_calc)
            project_count_map = {r[0]: max(1, r[1]) for r in cur.fetchall()}

            for emp_id in emp_ids_needing_calc:
                rec = resources_dict[emp_id]
                n_projects = project_count_map.get(emp_id, 1)
                computed_hours = round(40.0 / n_projects, 1)
                rec["w1"] = computed_hours
                rec["w2"] = computed_hours
                rec["w3"] = computed_hours
                rec["w4"] = computed_hours
                rec["allocation_percentage"] = round(100.0 / n_projects, 1)

        # Strip internal tracking flag before returning
        result = []
        for rec in resources_dict.values():
            rec.pop("_has_weekly_data", None)
            result.append(rec)

        return result

    except Exception as e:
        print("PROJECT RESOURCES FETCH ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{project_id}/resources")
def update_project_resources(project_id: str, payload: ResourceAllocationUpdate):
    import datetime

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT billable, start_date, end_date FROM projects WHERE project_id = %s", (project_id,))
        project_row = cur.fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        _validate_resource_rows(payload.resources)

        project_billable = (project_row[0] or "").lower()

        # Compute real ISO week numbers for the last 4 calendar weeks
        # so that weekly_allocations rows align with GET /resources slot mapping.
        today = datetime.date.today()
        monday = today - datetime.timedelta(days=today.weekday())
        real_week_nums = []
        for i in range(3, -1, -1):
            target_monday = monday - datetime.timedelta(weeks=i)
            real_week_nums.append(target_monday.isocalendar()[1])
        # real_week_nums[0] = w1 (3 wks ago), ..., real_week_nums[3] = w4 (current)
        current_year = today.year

        # Delete existing allocations AND weekly_allocations for this project
        cur.execute("""
            DELETE FROM weekly_allocations
            WHERE allocation_id IN (
                SELECT allocation_id FROM projects_allocation WHERE project_id = %s
            )
        """, (project_id,))
        cur.execute("DELETE FROM projects_allocation WHERE project_id = %s", (project_id,))

        for idx, tm in enumerate(payload.resources):
            # Prefer employee_id from payload; fall back to name lookup
            if tm.employee_id:
                cur.execute(
                    "SELECT employee_id FROM employee_master WHERE employee_id = %s LIMIT 1",
                    (tm.employee_id,)
                )
                emp_row = cur.fetchone()
                if not emp_row:
                    # Try name fallback if the provided id doesn't match
                    cur.execute(
                        "SELECT employee_id FROM employee_master WHERE LOWER(employee_name) = LOWER(%s) LIMIT 1",
                        (_normalize_text(tm.name),)
                    )
                    emp_row = cur.fetchone()
            else:
                cur.execute(
                    "SELECT employee_id FROM employee_master WHERE LOWER(employee_name) = LOWER(%s) LIMIT 1",
                    (_normalize_text(tm.name),)
                )
                emp_row = cur.fetchone()

            if not emp_row:
                raise HTTPException(
                    status_code=422,
                    detail=f"Resource '{tm.name}' does not exist in employee_master."
                )

            employee_id = emp_row[0]
            avg_hours = (tm.w1 + tm.w2 + tm.w3 + tm.w4) / 4 if any([tm.w1, tm.w2, tm.w3, tm.w4]) else 0
            allocation_pct = min(100, int((avg_hours / 40) * 100))
            allocation_id = f"AL-{project_id}-{idx + 1:03d}"
            project_tag = "Billable" if "non" not in project_billable else "Non-Billable"

            # Parse allocation dates from payload
            alloc_start = _parse_optional_date(tm.allocation_start_date)
            alloc_end = _parse_optional_date(tm.allocation_end_date)

            try:
                cur.execute("""
                    INSERT INTO projects_allocation (
                        allocation_id, employee_id, project_id,
                        role_in_project, allocation_percentage,
                        allocation_start_date, allocation_end_date,
                        project_tags
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    allocation_id, employee_id, project_id,
                    tm.role, allocation_pct,
                    alloc_start, alloc_end,
                    project_tag,
                ))

                # Insert weekly allocations using real ISO week numbers
                week_hours = [tm.w1, tm.w2, tm.w3, tm.w4]
                for slot_idx, hours in enumerate(week_hours):
                    if hours > 0:
                        iso_week = real_week_nums[slot_idx]
                        cur.execute("""
                            INSERT INTO weekly_allocations
                                (allocation_id, allocation_year, week_number, allocated_hours)
                            VALUES (%s, %s, %s, %s)
                        """, (allocation_id, current_year, iso_week, hours))
            except Exception as alloc_err:
                print(f"Allocation insert error for {tm.name}: {alloc_err}")

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
        release_db_connection(conn)


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
            if project_type.lower() == "internal":
                # Ensure it's non-billable if it's internal
                if "billable = %s" in fields:
                    idx = fields.index("billable = %s")
                    values[idx] = "Non-Billable"
                else:
                    fields.append("billable = %s")
                    values.append("Non-Billable")
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
        release_db_connection(conn)


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
        # Allow client_id to satisfy the client requirement even without a client name
        if project_type.lower() == "client" and not _normalize_text(project.client) and not project.client_id:
            raise HTTPException(status_code=422, detail="Client projects must include a client name or client ID.")
        if project_type.lower() == "partner" and not _normalize_text(project.partner):
            raise HTTPException(status_code=422, detail="Partner projects must include a partner name.")
        project_status = _normalize_project_status(project.project_status)

        cur.execute("""
            INSERT INTO projects (
                project_id, project_name, project_status, project_type, billable, client_name, client_id, start_date, end_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            project.project_id,
            project_name,
            project_status,
            project_type,
            "Non-Billable" if project_type.lower() == "internal" else _normalize_text(project.billable),
            _normalize_text(project.client) if project_type.lower() == "client" else _normalize_text(project.partner),
            project.client_id,
            project.start_date,
            project.end_date,
        ))

        for idx, tm in enumerate(project.team_members):
            # Prefer employee_id lookup; fall back to name lookup
            employee_id = None
            if tm.employee_id:
                cur.execute(
                    "SELECT employee_id FROM employee_master WHERE employee_id = %s LIMIT 1",
                    (tm.employee_id,)
                )
                emp_row = cur.fetchone()
                if emp_row:
                    employee_id = emp_row[0]

            if not employee_id and tm.name:
                cur.execute("""
                    SELECT employee_id FROM employee_master
                    WHERE LOWER(employee_name) = LOWER(%s)
                    LIMIT 1
                """, (_normalize_text(tm.name),))
                emp_row = cur.fetchone()
                if emp_row:
                    employee_id = emp_row[0]

            if not employee_id:
                # Skip unknown employees but don't block project creation
                print(f"Warning: Team member '{tm.name}' not found in employee_master — skipping allocation.")
                continue

            avg_hours = (tm.w1 + tm.w2 + tm.w3 + tm.w4) / 4 if any([tm.w1, tm.w2, tm.w3, tm.w4]) else 0
            allocation_pct = min(100, int((avg_hours / 40) * 100))
            allocation_id = f"AL-{project.project_id}-{idx + 1:03d}"

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

                import datetime as _dt
                current_year = _dt.date.today().year
                today = _dt.date.today()
                monday = today - _dt.timedelta(days=today.weekday())
                real_week_nums = [
                    (monday - _dt.timedelta(weeks=i)).isocalendar()[1]
                    for i in range(3, -1, -1)
                ]
                for slot_idx, hours in enumerate([tm.w1, tm.w2, tm.w3, tm.w4]):
                    if hours > 0:
                        iso_week = real_week_nums[slot_idx]
                        cur.execute("""
                            INSERT INTO weekly_allocations (allocation_id, allocation_year, week_number, allocated_hours)
                            VALUES (%s, %s, %s, %s)
                        """, (allocation_id, current_year, iso_week, hours))
            except Exception as alloc_err:
                # Log but don't block project creation
                print(f"Allocation insert skipped for {tm.name}: {alloc_err}")

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
        release_db_connection(conn)


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
        release_db_connection(conn)
