from datetime import date, datetime, timedelta
import uuid
import json
from typing import Dict, List, Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

from app.database import get_db_connection, release_db_connection
from app.rbac_utils import require_min_role, require_role, get_role, strip_fields
from app.routers.employees import _sync_employee_allocations

def ensure_project_columns():
    """Ensures necessary columns exist in the projects table."""
    conn = get_db_connection()
    if not conn:
        return
    cur = conn.cursor()
    try:
        cur.execute("""
            DO $$ 
            BEGIN 
                -- uuid column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='uuid') THEN
                    ALTER TABLE public.projects ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_uuid ON public.projects(uuid);
                END IF;

                -- department_id column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='department_id') THEN
                    ALTER TABLE public.projects ADD COLUMN department_id VARCHAR(50);
                ELSE
                    -- If it was created as INTEGER by previous attempt, cast it
                    BEGIN
                        ALTER TABLE public.projects ALTER COLUMN department_id TYPE VARCHAR(50);
                    EXCEPTION WHEN others THEN
                        -- if cast fails, drop and recreate
                        ALTER TABLE public.projects DROP COLUMN department_id;
                        ALTER TABLE public.projects ADD COLUMN department_id VARCHAR(50);
                    END;
                END IF;

                -- sub_status column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='sub_status') THEN
                    ALTER TABLE public.projects ADD COLUMN sub_status VARCHAR(100);
                END IF;
                
                -- Backfill if any NULLs found for UUID
                UPDATE public.projects SET uuid = gen_random_uuid() WHERE uuid IS NULL;
            END $$;
        """)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[Migration] Projects schema check failed: {e}")
    finally:
        cur.close()
        release_db_connection(conn)

# Run migration check on module import
ensure_project_columns()

router = APIRouter(prefix="/projects", tags=["Projects"], dependencies=[Depends(require_min_role("restricted_viewer"))])

def _resolve_project_id(identifier: str, cur):
    """
    Securely resolve a project_id from either a legacy sequential ID or a UUID.
    Returns the raw project_id if found, else raises 404.
    """
    try:
        # Check if it's a valid UUID
        uuid_obj = uuid.UUID(identifier)
        cur.execute("SELECT project_id FROM projects WHERE uuid = %s", (str(uuid_obj),))
    except (ValueError, AttributeError):
        # Fallback to direct ID for backward compatibility
        cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (identifier,))
    
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return row[0]

HOURS_PER_FTE = 40  # 100% allocation per week

def _sync_project_extensions(cur, project_id: str, old_end, new_end):
    """
    Sync allocation end dates and generate weekly hour records when a project is extended.
    """
    import datetime
    from datetime import date
    
    # Ensure we are comparing date objects
    if isinstance(old_end, str):
        try: old_end = datetime.datetime.strptime(old_end, "%Y-%m-%d").date()
        except: pass
    if isinstance(new_end, str):
        try: new_end = datetime.datetime.strptime(new_end, "%Y-%m-%d").date()
        except: pass

    if not (new_end and old_end and new_end > old_end):
        return

    # 1. Update allocation dates for all resources ending with or before the project
    cur.execute("""
        UPDATE projects_allocation 
           SET allocation_end_date = %s 
         WHERE project_id = %s 
           AND (allocation_end_date <= %s OR allocation_end_date IS NULL)
    """, (new_end, project_id, old_end))

    # 2. Fetch all project allocations to ensure weekly data exists for the gap
    cur.execute("""
        SELECT allocation_id, allocation_percentage, allocation_start_date, allocation_end_date
        FROM projects_allocation
        WHERE project_id = %s
    """, (project_id,))
    
    for aid, pct, a_start, a_end in cur.fetchall():
        if not a_start:
            continue
        # Generate the full distribution for the allocation percentage
        # Use the function defined in the current module
        weekly_map = _build_weekly_hours_from_pct(pct, a_start, a_end)
        
        for (w_year, w_num), hours in weekly_map.items():
            if hours <= 0:
                continue
            # Use ON CONFLICT DO NOTHING to avoid overwriting existing manual hour overrides
            cur.execute("""
                INSERT INTO weekly_allocations (allocation_id, allocation_year, week_number, allocated_hours)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (allocation_id, allocation_year, week_number) 
                DO NOTHING
            """, (aid, w_year, w_num, hours))

def _save_project_skills(cur, project_id, skills):
    """Saves project skills by clearing old ones and inserting new ones."""
    if skills is None:
        return
    
    # 1. Clear existing skills
    cur.execute("DELETE FROM project_skills WHERE project_id = %s", (project_id,))
    
    if not skills:
        return

    # 2. Insert new skills
    for skill in skills:
        skill = skill.strip()
        if not skill:
            continue
            
        # Ensure skill exists in the skills table
        cur.execute("""
            INSERT INTO skills (skill_name)
            VALUES (%s)
            ON CONFLICT (LOWER(TRIM(skill_name))) DO NOTHING
        """, (skill,))
        
        # Get the skill_id (whether newly inserted or already present)
        cur.execute("SELECT skill_id FROM skills WHERE LOWER(TRIM(skill_name)) = LOWER(TRIM(%s))", (skill,))
        skill_id = cur.fetchone()[0]
        
        # Insert into project_skills
        cur.execute("""
            INSERT INTO project_skills (project_id, skill_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (project_id, skill_id))


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
    department_id: Optional[str] = None
    skills: Optional[List[str]] = None


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    billable: Optional[str] = None
    type: Optional[str] = None
    client: Optional[str] = None
    client_id: Optional[str] = None
    partner_id: Optional[str] = None
    partner: Optional[str] = None
    department_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sub_status: Optional[str] = None
    skills: Optional[List[str]] = None


from app.routers.allocation_utils import (
    HOURS_PER_FTE, TeamMemberCreate, _parse_optional_date,
    _monday_of, _iter_week_keys, _normalize_week_key,
    _build_weekly_hours_from_pct, _fetch_existing_weekly_load,
    _available_capacity_pct, _validate_capacity, _capacity_snapshot,
    _build_weekly_distribution_for_rec, _validate_resource_rows,
    _derive_project_tag, _compute_allocation_pct, _get_project_week_numbers,
    _resolve_employee_id, _build_resource_record, _save_single_resource
)


class ResourceAllocationUpdate(BaseModel):
    resources: List[TeamMemberCreate]


class ProjectResourcesPdfExportRequest(BaseModel):
    resources: List[TeamMemberCreate]
    title: Optional[str] = None


class ProjectCreate(BaseModel):
    project_id: str
    project_name: str
    project_status: str
    type: str
    client_id: Optional[str] = None
    partner_id: Optional[str] = None
    department_id: Optional[str] = None
    billable: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    team_members: List[TeamMemberCreate] = []
    sub_status: Optional[str] = None
    skills: List[str] = []


VALID_PROJECT_TYPES = {"client", "internal", "partner", "poc"}
VALID_BILLABLE_VALUES = {"billable", "non-billable", "non billable", "non - billable"}
PROJECT_STATUS_ALIASES = {
    "not started": "Not Started",
    "not-started": "Not Started",
    "not_started": "Not Started",
    "planned": "Not Started",
    "upcoming": "Not Started",
    "in progress": "In Progress",
    "in-progress": "In Progress",
    "in_progress": "In Progress",
    "running": "In Progress",
    "live": "In Progress",
    "active": "In Progress",
    "ongoing": "In Progress",
    "on hold": "On Hold",
    "on-hold": "On Hold",
    "on_hold": "On Hold",
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
VALID_SUB_STATUSES = {"SOW_SIGNED": "SOW Signed", "SOW_NOT_SIGNED": "SOW Not Signed"}
PROJECT_TYPE_ALIASES = {
    "client": "Client",
    "external": "Client",
    "internal": "Internal",
    "partner": "Partner",
    "poc": "POC",
}


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _normalize_fk_id(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return _normalize_text(str(value))


def _normalize_project_status(value: Optional[str], end_date: Optional[date] = None, strict: bool = True) -> Optional[str]:
    from datetime import date as dt_date
    
    normalized = _normalize_text(value)
    if not normalized:
        if strict:
            raise HTTPException(status_code=422, detail="Project status is required.")
        return None

    key = " ".join(normalized.lower().split())
    canonical = PROJECT_STATUS_ALIASES.get(key)
    
    res = canonical if canonical else (normalized if not strict else "In Progress")
    
    # 1. Output-only derived markers (not for saving to DB)
    if not strict:
        # If explicitly Completed by user, respect it even if end_date is far in future
        if res == "Completed":
            return "Completed"
        
        # indicator logic: Past Due / Ending Soon
        if res == "In Progress":
            if not end_date:
                return "In Progress"
            
            today = dt_date.today()
            if end_date < today:
                return "In Progress - Overdue"
            if today >= (end_date - timedelta(days=7)):
                return "In Progress - Ending Soon"
            
            return "In Progress"
        
        if end_date and res in ("Not Started", "On Hold"):
            today = dt_date.today()
            if end_date < today:
                return "In Progress - Overdue"
            if today >= (end_date - timedelta(days=7)):
                return "In Progress - Ending Soon"
        
    return res


def _normalize_sub_status(value: Optional[str], strict: bool = False) -> Optional[str]:
    normalized = _normalize_text(value)
    if not normalized:
        return None
    key = normalized.replace(" ", "_").upper()
    if key in VALID_SUB_STATUSES:
        return key
    if strict:
        allowed = ", ".join(VALID_SUB_STATUSES.values())
        raise HTTPException(status_code=422, detail=f"Sub status must be one of: {allowed}.")
    return None


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


def _validate_status_and_substatus(status: Optional[str], sub_status: Optional[str]):
    normalized_status = _normalize_project_status(status)
    normalized_sub = _normalize_sub_status(sub_status)
    # sub_status is now purely optional; we no longer raise 422 if it is missing for In Progress
    if normalized_status != "In Progress":
        normalized_sub = None
    return normalized_status, normalized_sub




def _model_payload(model):
    return model.model_dump(exclude_unset=True) if hasattr(model, "model_dump") else model.dict(exclude_unset=True)


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_simple_pdf(lines: List[str]) -> bytes:
    escaped_lines = [_escape_pdf_text(line) for line in lines]

    content_chunks = [
        "BT",
        "/F1 10 Tf",
        "40 560 Td",
    ]
    for idx, line in enumerate(escaped_lines):
        if idx == 0:
            content_chunks.append(f"({line}) Tj")
        else:
            content_chunks.append("0 -12 Td")
            content_chunks.append(f"({line}) Tj")
    content_chunks.append("ET")
    content_stream = "\n".join(content_chunks).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    )
    objects.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    objects.append(
        b"5 0 obj\n<< /Length "
        + str(len(content_stream)).encode("ascii")
        + b" >>\nstream\n"
        + content_stream
        + b"\nendstream\nendobj\n"
    )

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            "trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            "startxref\n"
            f"{xref_start}\n"
            "%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


@router.get("/overview")
def projects_overview(
    department: Optional[str] = None,
    project_name: Optional[str] = None,
    resource_name: Optional[str] = None,
    status: Optional[str] = None,
    sow_status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    # Support both camelCase and snake_case
    final_start = start_date or startDate
    final_end = end_date or endDate

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        where_clause = ""
        join_clause = ""
        params = []
        
        # Robust check for "all" variations and null/undefined strings
        is_all_dept = not department or str(department).lower() in ('all', 'all department', 'all departments', 'null', 'undefined', '')
        
        if not is_all_dept:
            join_clause = """
                LEFT JOIN projects_allocation pa ON p.project_id = pa.project_id
                LEFT JOIN employee_master em ON pa.employee_id = em.employee_id
                LEFT JOIN departments d ON p.department_id = d.department_id
            """
            where_clause += """
                AND (
                    em.department = %s 
                    OR d.department_name = %s 
                    OR d.department_id = %s
                )
            """
            params.extend([department, department, department])

        if resource_name:
            if not join_clause:
                join_clause = " JOIN projects_allocation pa ON p.project_id = pa.project_id JOIN employee_master em ON pa.employee_id = em.employee_id "
            else:
                # If join_clause already exists (from department), we can reuse it or add another one
                # Reusing is better if possible.
                pass
            where_clause += " AND em.employee_name ILIKE %s "
            params.append(f"%{resource_name}%")

        if project_name:
            where_clause += " AND p.project_name ILIKE %s "
            params.append(f"%{project_name}%")

        if status and status.lower() not in ('all status', ''):
            # Resolve all keys that map to this canonical status for robust SQL filtering
            status_keys = [k.lower() for k, v in PROJECT_STATUS_ALIASES.items() if v.lower() == status.lower()]
            if not status_keys:
                status_keys = [status.lower()]
            
            where_clause += " AND LOWER(p.project_status) = ANY(%s) "
            params.append(status_keys)
        
        if sow_status:
            where_clause += " AND p.sub_status = %s "
            params.append(sow_status)

        # Date Range Filter — overlap semantics:
        # A project is included if its timeline (using effective dates) intersects
        # the filter window. project_end >= filter.start AND project_start <= filter.end.
        if final_start and final_start.strip():
            where_clause += """
                AND COALESCE(
                    p.end_date,
                    (SELECT MAX(allocation_end_date) FROM projects_allocation WHERE project_id = p.project_id)
                )::date >= %s::date
            """
            params.append(final_start.strip())

        if final_end and final_end.strip():
            where_clause += """
                AND COALESCE(
                    p.start_date,
                    (SELECT MIN(allocation_start_date) FROM projects_allocation WHERE project_id = p.project_id)
                )::date <= %s::date
            """
            params.append(final_end.strip())

        # Fetch projects to count them in Python using the centralized normalization logic
        # This ensures dashboard metrics ALWAYS match the list view.
        cur.execute(f"""
            SELECT 
                p.project_id,
                p.project_status,
                p.project_type,
                p.start_date,
                p.end_date
            FROM projects p
            {join_clause}
            WHERE 1=1 {where_clause}
            GROUP BY p.project_id, p.project_status, p.project_type, p.start_date, p.end_date
        """, tuple(params))
        
        projects = cur.fetchall()
        
        stats = {
            "totalProjects": len(projects),
            "internalProjects": 0,
            "externalProjects": 0,
            "ongoingProjects": 0,
            "overdueProjects": 0,
            "endingSoonProjects": 0,
            "upcomingProjects": 0,
            "completedProjects": 0,
        }

        for p_id, p_status, p_type, p_start, p_end in projects:
            # 1. Normalize Type
            norm_type = _normalize_project_type(p_type, strict=False).lower()
            if norm_type in ('internal', 'poc'):
                stats["internalProjects"] += 1
            else:
                stats["externalProjects"] += 1

            # 2. Derive Status (using Output mode, strict=False)
            # This logic must match frontend's indicator logic
            derived = _normalize_project_status(p_status, end_date=p_end, strict=False)
            
            if derived == "Completed":
                stats["completedProjects"] += 1
            elif "Overdue" in derived:
                stats["overdueProjects"] += 1
            elif "Ending Soon" in derived:
                stats["endingSoonProjects"] += 1
            elif derived in ("In Progress", "Not Started", "On Hold"):
                stats["ongoingProjects"] += 1
            
            if derived == "Not Started":
                stats["upcomingProjects"] += 1

        return stats
    except Exception as e:
        print("PROJECTS OVERVIEW ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/list")
def projects_list(
    department: Optional[str] = None, 
    project_name: Optional[str] = None,
    resource_name: Optional[str] = None,
    status: Optional[str] = None,
    sow_status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    # Support both camelCase and snake_case
    final_start = start_date or startDate
    final_end = end_date or endDate

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        where_clause = " WHERE 1=1 "
        params = []
        
        # Department Filter — match on project.department_id (name match) OR resources' department
        # Robust check for "all" variations and null/undefined strings
        is_all_dept = not department or str(department).lower() in ('all', 'all department', 'all departments', 'null', 'undefined', '')
        
        if not is_all_dept:
            where_clause += """
                AND (
                    EXISTS (
                        SELECT 1 FROM departments d_dept
                        WHERE d_dept.department_id = p.department_id
                          AND (d_dept.department_name = %s OR d_dept.department_id = %s)
                    )
                    OR EXISTS (
                        SELECT 1 FROM projects_allocation pa_dept
                        JOIN employee_master em_dept ON pa_dept.employee_id = em_dept.employee_id
                        WHERE pa_dept.project_id = p.project_id
                          AND em_dept.department = %s
                    )
                )
            """
            params.extend([department, department, department])

        # Resource Name Filter
        if resource_name:
            where_clause += """
                AND EXISTS (
                    SELECT 1 FROM projects_allocation pa_res
                    JOIN employee_master em_res ON pa_res.employee_id = em_res.employee_id
                    WHERE pa_res.project_id = p.project_id
                      AND em_res.employee_name ILIKE %s
                )
            """
            params.append(f"%{resource_name}%")

        # Date Range Filter — overlap semantics:
        # A project is included if its timeline (using effective dates) intersects
        # the filter window. project_end >= filter.start AND project_start <= filter.end.
        if final_start and final_start.strip():
            where_clause += """
                AND COALESCE(
                    p.end_date,
                    (SELECT MAX(allocation_end_date) FROM projects_allocation WHERE project_id = p.project_id)
                )::date >= %s::date
            """
            params.append(final_start.strip())

        if final_end and final_end.strip():
            where_clause += """
                AND COALESCE(
                    p.start_date,
                    (SELECT MIN(allocation_start_date) FROM projects_allocation WHERE project_id = p.project_id)
                )::date <= %s::date
            """
            params.append(final_end.strip())

        if project_name:
            where_clause += " AND p.project_name ILIKE %s "
            params.append(f"%{project_name}%")
        
        if status and status.lower() not in ('all status', ''):
            # Resolve all keys that map to this canonical status for robust SQL filtering
            # Sidebar filter usually sends the display name (e.g., "In Progress")
            status_keys = [k for k, v in PROJECT_STATUS_ALIASES.items() if v.lower() == status.lower()]
            if not status_keys:
                status_keys = [status.lower()]
            
            # Robust mapping: check against literal column AND normalized version (stripping underscores/hyphens)
            where_clause += """ 
                AND (
                    LOWER(p.project_status) = ANY(%s) 
                    OR LOWER(REPLACE(REPLACE(p.project_status, '_', ' '), '-', ' ')) = ANY(%s)
                )
            """
            params.extend([status_keys, [s.replace('_', ' ').replace('-', ' ') for s in status_keys]])
        
        if sow_status:
            where_clause += " AND p.sub_status = %s "
            params.append(sow_status)

        cur.execute(f"""
            SELECT
                p.project_id,
                p.project_name,
                p.project_status,
                p.project_type,
                p.start_date,
                p.end_date,
                COALESCE(p.start_date, (SELECT MIN(allocation_start_date) FROM projects_allocation WHERE project_id = p.project_id)) as effective_start,
                COALESCE(p.end_date, (SELECT MAX(allocation_end_date) FROM projects_allocation WHERE project_id = p.project_id)) as effective_end,
                (
                    SELECT COUNT(DISTINCT pa_all.employee_id)
                    FROM projects_allocation pa_all
                    WHERE pa_all.project_id = p.project_id
                ) AS resource_count,
                (
                    SELECT JSON_AGG(json_row)
                    FROM (
                        SELECT JSON_BUILD_OBJECT('name', em2.employee_name, 'id', em2.employee_id, 'photo_url', em2.photo_url) AS json_row
                        FROM projects_allocation pa2
                        JOIN employee_master em2 ON pa2.employee_id = em2.employee_id
                        WHERE pa2.project_id = p.project_id
                        ORDER BY pa2.allocation_percentage DESC
                        LIMIT 6
                    ) AS limited_members
                ) AS team_members,
                (
                    SELECT STRING_AGG(em3.employee_name, ', ')
                    FROM projects_allocation pa3
                    JOIN employee_master em3 ON pa3.employee_id = em3.employee_id
                    WHERE pa3.project_id = p.project_id
                ) AS resource_names,
                c.client_name,
                pr.partner_name,
                p.billable,
                p.client_id,
                p.partner_id,
                p.uuid,
                p.department_id,
                d.department_name,
                (
                    SELECT JSON_AGG(s.skill_name)
                    FROM project_skills ps
                    JOIN skills s ON ps.skill_id = s.skill_id
                    WHERE ps.project_id = p.project_id
                ) AS skills
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.client_id
            LEFT JOIN partners pr ON p.partner_id = pr.partner_id
            LEFT JOIN departments d ON p.department_id = d.department_id
            {where_clause}
            GROUP BY p.project_id, p.project_name, p.project_status, p.project_type, p.start_date, p.end_date, c.client_name, pr.partner_name, p.billable, p.client_id, p.partner_id, p.uuid, p.department_id, d.department_name
            ORDER BY p.start_date DESC NULLS LAST
        """, tuple(params))
        results = cur.fetchall()
        
        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "status": _normalize_project_status(r[2], strict=False) if r[2] else "Unknown",
                "sub_status": None,
                "type": _normalize_project_type(r[3], strict=False) if r[3] else "Unknown",
                "start_date": r[4],
                "end_date": r[5],
                "effective_start": r[6],
                "effective_end": r[7],
                "resource_count": r[8],
                "team_members": r[9] if r[9] else [],
                "resource_names": r[10] or "None",
                "client_name": r[11],
                "partner_name": r[12],
                "billable": r[13] if r[13] else "Unknown",
                "client_id": r[14],
                "partner_id": r[15],
                "uuid": str(r[16]) if r[16] else None,
                "department_id": r[17],
                "department_name": r[18],
                "skills": r[19] if r[19] else []
            }
            for r in results
        ]
    except Exception as e:
        print("PROJECTS LIST ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("/skills/ensure", dependencies=[Depends(require_min_role("editor"))])
def ensure_skill(payload: dict):
    """Ensure a skill exists in the skills table, creating it if absent. Returns the canonical skill_name."""
    skill_name = str(payload.get("skill_name") or "").strip()
    if not skill_name:
        raise HTTPException(status_code=400, detail="skill_name is required")
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT skill_name FROM skills WHERE LOWER(TRIM(skill_name)) = LOWER(%s)", (skill_name,))
        row = cur.fetchone()
        if row:
            return {"skill_name": row[0]}
        cur.execute("INSERT INTO skills (skill_name) VALUES (%s) RETURNING skill_name", (skill_name,))
        inserted = cur.fetchone()[0]
        conn.commit()
        return {"skill_name": inserted}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/departments")
def list_departments():
    """Return all unique departments for use in dropdowns.

    Combines departments table with any unique department names referenced
    via employee_master.department so dropdowns show every department that
    actually exists in the data.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT department_id, department_name
            FROM (
                SELECT department_id, department_name
                FROM departments
                WHERE department_name IS NOT NULL
                  AND TRIM(department_name) <> ''
                UNION
                SELECT NULL AS department_id, TRIM(em.department) AS department_name
                FROM employee_master em
                WHERE em.department IS NOT NULL
                  AND TRIM(em.department) <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM departments d
                      WHERE LOWER(TRIM(d.department_name)) = LOWER(TRIM(em.department))
                  )
            ) AS combined
            ORDER BY department_name
        """)
        rows = cur.fetchall()
        return [{"id": r[0], "name": r[1]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/{project_id}/details")
def get_project_details(project_id: str, _user: dict = Depends(require_min_role("restricted_viewer"))):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        cur.execute("""
            SELECT 
                p.project_id, p.project_name, p.project_status, p.billable, p.start_date, p.end_date,
                c.client_name, pr.partner_name,
                pc.budget, pc.billing_type, pc.contract_type, pc.revenue_model, pc.commercial_notes,
                ps.objective, ps.deliverables, ps.milestones, ps.timeline_notes,
                p.client_id, p.partner_id, p.project_type, p.uuid,
                p.department_id, d.department_name
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.client_id
            LEFT JOIN partners pr ON p.partner_id = pr.partner_id
            LEFT JOIN project_commercials pc ON p.project_id = pc.project_id
            LEFT JOIN project_scopes ps ON p.project_id = ps.project_id
            LEFT JOIN departments d ON p.department_id = d.department_id
            WHERE p.project_id = %s
        """, (project_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        project_details = {
            "project_id": row[0],
            "project_name": row[1],
            "status": _normalize_project_status(row[2], strict=False) if row[2] else None,
            "sub_status": None,
            "billable": row[3],
            "start_date": row[4],
            "end_date": row[5],
            "client_name": row[6],
            "partner_name": row[7],
            "budget": row[8] or "$0",
            "billing_type": row[9] or "Not Set",
            "contract_type": row[10] or "Not Set",
            "revenue_model": row[11] or "Not Set",
            "commercial_notes": row[12] or "No notes.",
            "objective": row[13] or "Not defined.",
            "deliverables": row[14] or "No deliverables listed.",
            "milestones": row[15] or "No milestones listed.",
            "timeline_notes": row[16] or "No timeline notes.",
            "client_id": row[17],
            "partner_id": row[18],
            "type": row[19],
            "uuid": str(row[20]) if row[20] else None,
            "department_id": str(row[21]) if row[21] else None,
            "department_name": row[22] or "No Department",
            "skills": []
        }
        
        # Fetch skills
        cur.execute("""
            SELECT s.skill_name
            FROM project_skills ps
            JOIN skills s ON ps.skill_id = s.skill_id
            WHERE ps.project_id = %s
            ORDER BY s.skill_name
        """, (project_id,))
        project_details["skills"] = [r[0] for r in cur.fetchall()]
        
        return strip_fields(project_details, get_role(_user), "project_detail")
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{project_id}/details")
def update_project_details(project_id: str, details: ProjectDetailsUpdate, _user: dict = Depends(require_min_role("editor"))):
    from app.rbac_utils import is_admin
    if not is_admin(_user):
        details.budget = None
        details.billing_type = None
        details.contract_type = None
        details.revenue_model = None
        details.commercial_notes = None

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        # 1. Fetch current (old) project dates to check for extensions
        cur.execute("SELECT start_date, end_date FROM projects WHERE project_id = %s", (project_id,))
        old_proj = cur.fetchone()
        if not old_proj:
            raise HTTPException(status_code=404, detail="Project not found")
        
        old_start_proj, old_end_proj = old_proj

        start_date_val = None if not details.start_date or details.start_date in ['Not Set', 'TBD'] else details.start_date
        end_date_val = None if not details.end_date or details.end_date in ['Not Set', 'TBD'] else details.end_date

        new_end_proj = None
        if end_date_val:
            try:
                new_end_proj = datetime.strptime(end_date_val, "%Y-%m-%d").date() if isinstance(end_date_val, str) else end_date_val
            except Exception:
                pass

        # 2. Update core projects
        cur.execute("""
            UPDATE projects SET
                start_date = COALESCE(%s, start_date),
                end_date = COALESCE(%s, end_date),
                department_id = COALESCE(%s, department_id)
            WHERE project_id = %s
        """, (start_date_val, end_date_val, details.department_id, project_id))

        # 3. Synchronize Allocations if extended (Synchronize dates + hours)
        _sync_project_extensions(cur, project_id, old_end_proj, new_end_proj)

        # 4. Partial update for commercial details
        cur.execute("""
            INSERT INTO project_commercials (project_id, budget, billing_type, contract_type, revenue_model, commercial_notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (project_id) DO UPDATE SET
                budget = COALESCE(EXCLUDED.budget, project_commercials.budget),
                billing_type = COALESCE(EXCLUDED.billing_type, project_commercials.billing_type),
                contract_type = COALESCE(EXCLUDED.contract_type, project_commercials.contract_type),
                revenue_model = COALESCE(EXCLUDED.revenue_model, project_commercials.revenue_model),
                commercial_notes = COALESCE(EXCLUDED.commercial_notes, project_commercials.commercial_notes)
        """, (project_id, details.budget, details.billing_type, details.contract_type, details.revenue_model, details.commercial_notes))
        
        # Partial update for scope details
        cur.execute("""
            INSERT INTO project_scopes (project_id, objective, deliverables, milestones, timeline_notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (project_id) DO UPDATE SET
                objective = COALESCE(EXCLUDED.objective, project_scopes.objective),
                deliverables = COALESCE(EXCLUDED.deliverables, project_scopes.deliverables),
                milestones = COALESCE(EXCLUDED.milestones, project_scopes.milestones),
                timeline_notes = COALESCE(EXCLUDED.timeline_notes, project_scopes.timeline_notes)
        """, (project_id, details.objective, details.deliverables, details.milestones, details.timeline_notes))
        
        # 5. Update skills
        _save_project_skills(cur, project_id, details.skills)
        
        conn.commit()
        print(f"SUCCESS: Project {project_id} details updated and committed.")
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
        project_id = _resolve_project_id(project_id, cur)
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
                wa.allocation_year,
                wa.week_number,
                COALESCE(wa.allocated_hours, 0),
                pa.project_tags,
                em.photo_url
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            LEFT JOIN weekly_allocations wa ON pa.allocation_id = wa.allocation_id
            WHERE pa.project_id = %s
            ORDER BY em.employee_name, wa.allocation_year, wa.week_number
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
                raw_tag = (r[11] or "").strip().lower()
                billable_shadow = "Non-billable" if raw_tag == "non-billable" else "Billable"
                resources_dict[emp_id] = {
                    "employee_id": emp_id,
                    "name": r[0] if r[0] else "Unknown Resource",
                    "role": r[1] if r[1] else "Team Member",
                    "company": "Cloud Destinations",
                    "location": r[2] if r[2] else "Remote",
                    "allocation_id": r[4],
                    "allocation_start_date": str(r[5]) if r[5] else None,
                    "allocation_end_date": str(r[6]) if r[6] else None,
                    "allocation_percentage": r[7] or 0,
                    "billable_shadow": billable_shadow,
                    "photo_url": r[12],
                    "w1": 0.0, "w2": 0.0, "w3": 0.0, "w4": 0.0,
                    "weekly_hours": {},
                    "_has_weekly_data": False,
                }

            year_num = r[8]
            week_num = r[9]
            hours = float(r[10]) if (r[10] is not None) else 0.0
            
            if week_num is not None and hours > 0:
                if year_num is None:
                    year_num = today.year
                
                # Full dynamic dict mapping
                resources_dict[emp_id]["weekly_hours"][f"{year_num}-{week_num}"] = hours
                
                # Backwards compatibility w1-w4 (current 4-week window)
                if week_num in week_to_slot:
                    resources_dict[emp_id][week_to_slot[week_num]] = hours

                resources_dict[emp_id]["_has_weekly_data"] = True

        # ── Dynamic calculation for employees with no stored weekly data ────
        # For each such employee, count how many active projects they are on
        # and divide 40h equally across those projects.
        emp_ids = list(resources_dict.keys())
        project_count_map = {}
        if emp_ids:
            placeholders = ",".join(["%s"] * len(emp_ids))
            cur.execute(f"""
                SELECT pa.employee_id, COUNT(DISTINCT pa.project_id) AS active_count
                FROM projects_allocation pa
                JOIN projects p ON pa.project_id = p.project_id
                WHERE pa.employee_id IN ({placeholders})
                  AND LOWER(p.project_status) NOT IN (
                      'completed', 'closed', 'ended', 'end', 'done', 'cancelled'
                  )
                GROUP BY pa.employee_id
            """, emp_ids)
            project_count_map = {r[0]: (r[1] or 0) for r in cur.fetchall()}

        for emp_id, rec in resources_dict.items():
            n_projects = max(1, project_count_map.get(emp_id, 0))
            rec["project_count"] = n_projects
            if not rec["_has_weekly_data"]:
                computed_hours = round(40.0 / n_projects, 1)
                rec["w1"] = computed_hours
                rec["w2"] = computed_hours
                rec["w3"] = computed_hours
                rec["w4"] = computed_hours
                rec["allocation_percentage"] = round(100.0 / n_projects, 1)

        # Strip internal tracking flag before returning
        capacity = _capacity_snapshot(cur, list(resources_dict.keys()))
        result = []
        for rec in resources_dict.values():
            rec.pop("_has_weekly_data", None)
            cap = capacity.get(str(rec["employee_id"]), {"used_pct": rec.get("allocation_percentage", 0), "available_pct": max(0.0, 100.0 - (rec.get("allocation_percentage", 0) or 0))})
            rec["current_allocation_pct"] = cap["used_pct"]
            rec["available_capacity_pct"] = cap["available_pct"]
            rec["capacity_status"] = "red" if cap["available_pct"] <= 0 else ("amber" if cap["available_pct"] < 20 else "green")
            rec["weekly_distribution"] = _build_weekly_distribution_for_rec(rec)
            result.append(rec)

        return result

    except Exception as e:
        print("PROJECT RESOURCES FETCH ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("/{project_id}/resources", dependencies=[Depends(require_min_role("editor"))])
def create_project_resource(project_id: str, payload: TeamMemberCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        cur.execute("SELECT billable, start_date, end_date FROM projects WHERE project_id = %s", (project_id,))
        project_row = cur.fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        resource = _save_single_resource(
            cur,
            project_id,
            payload,
            project_row[0],
            project_start=project_row[1],
            project_end=project_row[2],
        )
        conn.commit()
        return {"message": "Resource created successfully", "resource": resource}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.patch("/{project_id}/resources/{allocation_id}", dependencies=[Depends(require_min_role("editor"))])
def update_project_resource(project_id: str, allocation_id: str, payload: TeamMemberCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        cur.execute("SELECT billable, start_date, end_date FROM projects WHERE project_id = %s", (project_id,))
        project_row = cur.fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        cur.execute(
            "SELECT 1 FROM projects_allocation WHERE allocation_id = %s AND project_id = %s",
            (allocation_id, project_id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Allocation not found")

        resource = _save_single_resource(
            cur,
            project_id,
            payload,
            project_row[0],
            replace_allocation_id=allocation_id,
            project_start=project_row[1],
            project_end=project_row[2],
        )
        conn.commit()
        return {"message": "Resource updated successfully", "resource": resource}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.delete("/{project_id}/resources/{allocation_id}", dependencies=[Depends(require_min_role("editor"))])
def delete_project_resource(project_id: str, allocation_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        cur.execute(
            "SELECT employee_id FROM projects_allocation WHERE allocation_id = %s AND project_id = %s",
            (allocation_id, project_id)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Allocation not found")
        emp_id = row[0]

        cur.execute("DELETE FROM weekly_allocations WHERE allocation_id = %s", (allocation_id,))
        cur.execute(
            "DELETE FROM projects_allocation WHERE allocation_id = %s AND project_id = %s",
            (allocation_id, project_id)
        )
        
        # Trigger sync for the employee who was just removed
        _sync_employee_allocations(cur, {emp_id})
        
        conn.commit()
        return {"message": "Resource deleted successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("/{project_id}/resources/export/pdf")
def export_project_resources_pdf(project_id: str, payload: ProjectResourcesPdfExportRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        resolved_project_id = _resolve_project_id(project_id, cur)
        resources = payload.resources or []
        title = _normalize_text(payload.title) or f"Resource Allocation - {resolved_project_id}"
        generated_on = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        lines = [
            title,
            f"Generated on: {generated_on}",
            "",
            "Resource | Role | Start | End | Allocation | W1 | W2 | W3 | W4 | Total",
        ]

        for row in resources[:38]:
            project_count = row.model_dump().get("project_count") if hasattr(row, "model_dump") else None
            if project_count is None:
                project_count = getattr(row, "project_count", None)
            try:
                project_count_num = float(project_count) if project_count is not None else 0
            except Exception:
                project_count_num = 0
            allocation_pct = 0 if project_count_num <= 0 else round(100 / project_count_num)

            total = (row.w1 or 0) + (row.w2 or 0) + (row.w3 or 0) + (row.w4 or 0)
            line = (
                f"{(row.name or '-')} | {(row.role or '-')} | "
                f"{(row.allocation_start_date or '-') } | {(row.allocation_end_date or '-')} | "
                f"{allocation_pct}% | {row.w1 or 0}h | {row.w2 or 0}h | {row.w3 or 0}h | {row.w4 or 0}h | {total}h"
            )
            lines.append(line)

        if len(resources) > 38:
            lines.append(f"... and {len(resources) - 38} more rows")

        pdf_bytes = _build_simple_pdf(lines)
        if not pdf_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate PDF.")

        filename = f"Allocation_{resolved_project_id}_{date.today().isoformat()}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        print(f"PDF Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{project_id}/resources", dependencies=[Depends(require_min_role("editor"))])
def update_project_resources(project_id: str, payload: ResourceAllocationUpdate):
    import datetime

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        cur.execute("SELECT billable, start_date, end_date FROM projects WHERE project_id = %s", (project_id,))
        project_row = cur.fetchone()
        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        _validate_resource_rows(payload.resources)

        project_billable = (project_row[0] or "").lower()

        # Capture all employee IDs currently in this project to sync them later (even if they are removed)
        cur.execute("SELECT DISTINCT employee_id FROM projects_allocation WHERE project_id = %s", (project_id,))
        affected_employee_ids = {r[0] for r in cur.fetchall()}

        # Delete existing allocations AND weekly_allocations for this project
        cur.execute("""
            DELETE FROM weekly_allocations
            WHERE allocation_id IN (
                SELECT allocation_id FROM projects_allocation WHERE project_id = %s
            )
        """, (project_id,))
        cur.execute("DELETE FROM projects_allocation WHERE project_id = %s", (project_id,))

        for idx, tm in enumerate(payload.resources):
            # generate deterministic allocation id for bulk edit
            tm.allocation_id = tm.allocation_id or f"AL-{project_id}-{idx + 1:03d}"
            res = _save_single_resource(
                cur,
                project_id,
                tm,
                project_billable,
                replace_allocation_id=None,
                project_start=project_row[1],
                project_end=project_row[2],
                validate_capacity=False,
            )
            # Add new/updated employees to the sync set
            if res.get("employee_id"):
                affected_employee_ids.add(res["employee_id"])

        # Final sync for all affected employees (both removed and kept/added)
        if affected_employee_ids:
            _sync_employee_allocations(cur, affected_employee_ids)

        conn.commit()
        print(f"SUCCESS: Project {project_id} resources updated (count: {len(payload.resources)}) and committed.")
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


@router.put("/{project_id}", dependencies=[Depends(require_min_role("editor"))])
def update_project(project_id: str, updates: ProjectUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
        cur.execute("SELECT project_status, end_date FROM projects WHERE project_id = %s", (project_id,))
        current_row = cur.fetchone()
        if not current_row:
            raise HTTPException(status_code=404, detail="Project not found")
        current_status, old_end_date = current_row

        payload = _model_payload(updates)
        if not payload:
            raise HTTPException(status_code=400, detail="No project fields were provided.")
        
        # 2. Update skills if provided
        if "skills" in payload:
            _save_project_skills(cur, project_id, payload["skills"])

        start_date_value = payload.get("start_date")
        end_date_value = payload.get("end_date")
        _validate_project_dates(start_date_value, end_date_value)

        # Validate status/sub-status together (if provided)
        status_value = payload.get("project_status")
        sub_status_value = payload.get("sub_status")
        normalized_status = None
        normalized_sub_status = None
        if status_value is not None:
            normalized_status, _ = _validate_status_and_substatus(status_value, None)

        updates_map = {}

        if "project_name" in payload:
            project_name = _normalize_text(payload["project_name"])
            if not project_name:
                raise HTTPException(status_code=422, detail="Project name cannot be empty.")
            if len(project_name) > 255:
                raise HTTPException(status_code=422, detail="Project name cannot exceed 255 characters.")
            updates_map["project_name"] = project_name

        if "project_status" in payload:
            new_val = normalized_status or _normalize_project_status(payload["project_status"])
            if current_status != new_val:
                print(f"STATUS TRANSITION for project {project_id}: '{current_status}' -> '{new_val}'")
            updates_map["project_status"] = new_val

        if "billable" in payload:
            billable = _normalize_text(payload["billable"])
            if billable and billable.lower() not in VALID_BILLABLE_VALUES:
                raise HTTPException(status_code=422, detail="Billable must be either Billable or Non-Billable.")
            updates_map["billable"] = billable

        if "type" in payload:
            project_type = _normalize_project_type(payload["type"])
            updates_map["project_type"] = project_type
            if project_type.lower() == "internal":
                updates_map["billable"] = "Non-Billable"

        if "start_date" in payload:
            updates_map["start_date"] = start_date_value

        if "end_date" in payload:
            updates_map["end_date"] = end_date_value

        if "client_id" in payload:
            updates_map["client_id"] = _normalize_fk_id(payload["client_id"])

        if "partner_id" in payload:
            updates_map["partner_id"] = _normalize_fk_id(payload["partner_id"])

        if "department_id" in payload:
            updates_map["department_id"] = _normalize_fk_id(payload["department_id"]) or None

        # Handle sub_status column removed from projects table logic to fix crash
        # tracking sub_status in memory but not saving to DB
        ignore_sub_status = None
        # Handle sub_status once
        if sub_status_value is not None or ("project_status" in payload):
            if (normalized_status or "").lower() == "in progress":
                ignore_sub_status = normalized_sub_status
            else:
                ignore_sub_status = None

        if not updates_map and "skills" not in payload:
            raise HTTPException(status_code=400, detail="No valid project fields were provided.")
        
        if updates_map:
            print(f"UPDATING PROJECT {project_id} WITH:", updates_map)
            fields = [f"{col} = %s" for col in updates_map.keys()]
            values = list(updates_map.values())
            values.append(project_id)
            cur.execute(f"UPDATE projects SET {', '.join(fields)} WHERE project_id = %s", tuple(values))

        # 3. Synchronize Allocations if end_date was extended (Dates + Hours)
        if updates_map.get("end_date"):
            _sync_project_extensions(cur, project_id, old_end_date, updates_map["end_date"])

        conn.commit()

        # Verification step as requested
        cur.execute("SELECT project_name, project_status FROM projects WHERE project_id = %s", (project_id,))
        verified_row = cur.fetchone()
        new_name = verified_row[0] if verified_row else "NOT FOUND"
        new_status = verified_row[1] if verified_row else "NOT FOUND"
        print(f"DB verification for project {project_id}: Name='{new_name}', Status='{new_status}'")

        return {
            "message": "Project updated successfully",
            "updated_fields": updates_map,
            "current_name": new_name
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("", dependencies=[Depends(require_min_role("editor"))])
def create_project(project: ProjectCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_name = _normalize_text(project.project_name)
        if not project_name:
            raise HTTPException(status_code=422, detail="Project name is required.")
        project_type = _normalize_project_type(project.type)
        normalized_type = project_type.lower()
        client_id_value = _normalize_fk_id(project.client_id)
        partner_id_value = _normalize_fk_id(project.partner_id)
        if project.billable and project.billable.lower() not in VALID_BILLABLE_VALUES:
            raise HTTPException(status_code=422, detail="Billable must be either Billable or Non-Billable.")
        if normalized_type == "client" and not client_id_value:
            raise HTTPException(status_code=422, detail="Client projects must include a client_id.")
        if normalized_type == "partner" and not partner_id_value:
            raise HTTPException(status_code=422, detail="Partner projects must include a partner_id.")
        project_status, sub_status_val = _validate_status_and_substatus(project.project_status, project.sub_status)
        print(f"CREATING PROJECT '{project_name}' with status: '{project_status}'")
        insert_fields = ["project_id", "project_name", "project_status", "project_type", "billable", "start_date", "end_date"]
        insert_values = [
            project.project_id,
            project_name,
            project_status,
            project_type,
            "Non-Billable" if normalized_type == "internal" else _normalize_text(project.billable),
            project.start_date,
            project.end_date,
        ]

        if client_id_value is not None:
            insert_fields.insert(5, "client_id")
            insert_values.insert(5, client_id_value)
        if partner_id_value is not None:
            insert_fields.insert(5, "partner_id")
            insert_values.insert(5, partner_id_value)
        department_id_value = _normalize_fk_id(project.department_id)
        if department_id_value is not None:
            insert_fields.append("department_id")
            insert_values.append(department_id_value)

        placeholders = ", ".join(["%s"] * len(insert_fields))
        cur.execute(f"INSERT INTO projects ({', '.join(insert_fields)}) VALUES ({placeholders})", tuple(insert_values))
        
        # Save project skills
        if project.skills:
            _save_project_skills(cur, project.project_id, project.skills)

        for idx, tm in enumerate(project.team_members):
            tm.allocation_id = tm.allocation_id or f"AL-{project.project_id}-{idx + 1:03d}"
            try:
                _save_single_resource(
                    cur,
                    project.project_id,
                    tm,
                    project.billable or "",
                    project_start=project.start_date,
                    project_end=project.end_date,
                )
            except HTTPException as exc:
                detail = str(getattr(exc, "detail", ""))
                if "does not exist in employee_master" in detail:
                    print(f"Warning: Team member '{tm.name}' not found in employee_master - skipping allocation.")
                    continue
                raise

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


@router.delete("/{project_id}", dependencies=[Depends(require_min_role("editor"))])
def delete_project(project_id: str):
    import psycopg2.errors

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        project_id = _resolve_project_id(project_id, cur)
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
