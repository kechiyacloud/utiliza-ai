from datetime import date, datetime, timedelta
import uuid
import json
from typing import Dict, List, Optional

import psycopg2
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

from app.database import get_db_connection, release_db_connection

router = APIRouter(prefix="/projects", tags=["Projects"])

HOURS_PER_FTE = 40  # 100% allocation per week

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
    client_id: Optional[str] = None
    partner_id: Optional[str] = None
    partner: Optional[str] = None
    department_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sub_status: Optional[str] = None


class TeamMemberCreate(BaseModel):
    allocation_id: Optional[str] = None
    employee_id: Optional[str] = None
    name: str
    role: str
    location: Optional[str] = "Remote"
    allocation_pct: Optional[int] = None          # explicit allocation percentage 0-100
    allocation_start_date: Optional[str] = None
    allocation_end_date: Optional[str] = None
    billable_shadow: Optional[str] = "Billable"   # 'Billable' | 'Shadow'
    weekly_hours: Optional[Dict] = Field(default_factory=dict)  # {"2026-15": 40} or {15: 40}
    # Backward-compat fields (used by PDF export and existing callers)
    project_count: Optional[float] = None
    department: Optional[str] = None
    company: Optional[str] = "Cloud Destinations"
    company_type: Optional[str] = "Internal"
    w1: float = 0
    w2: float = 0
    w3: float = 0
    w4: float = 0

    @field_validator("allocation_pct", mode="before")
    def _clean_allocation_pct(cls, v):
        if v in ("", None):
            return None
        try:
            return int(float(v))
        except (TypeError, ValueError):
            raise ValueError("allocation_pct must be a number")

    @field_validator("w1", "w2", "w3", "w4", mode="before")
    def _clean_week_slots(cls, v):
        if v in ("", None):
            return 0.0
        try:
            return float(v)
        except (TypeError, ValueError):
            raise ValueError("Weekly hour slots must be numbers")

    @field_validator("weekly_hours", mode="before")
    def _clean_weekly_hours(cls, v):
        if not v:
            return {}
        cleaned = {}
        for wk, hrs in dict(v).items():
            if hrs in ("", None):
                continue
            try:
                hours_val = float(hrs)
            except (TypeError, ValueError):
                continue
            wk_str = str(wk)
            if "-" in wk_str:
                cleaned[wk_str] = hours_val          # keep "year-week" string as-is
            else:
                try:
                    cleaned[int(wk_str)] = hours_val  # keep plain week-number as int
                except ValueError:
                    continue
        return cleaned


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
    "closed": "COMPLETED",
    "completed": "COMPLETED",
    "done": "COMPLETED",
    "ended": "COMPLETED",
    "end": "COMPLETED",
    "finished": "COMPLETED",
}
VALID_PROJECT_STATUSES = {"Not Started", "In Progress", "On Hold", "COMPLETED"}
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


def _parse_optional_date(value: Optional[str]):
    value = _normalize_text(value)
    if not value or value in {"Not Set", "TBD"}:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid date format '{value}'. Expected YYYY-MM-DD.") from exc


def _normalize_project_status(value: Optional[str], end_date: Optional[date] = None, strict: bool = True) -> Optional[str]:
    from datetime import date as dt_date
    
    # 1. Date-based completion check (yesterday/past date logic)
    if end_date and end_date < dt_date.today():
        return "COMPLETED"

    normalized = _normalize_text(value)
    if not normalized:
        if strict:
            raise HTTPException(status_code=422, detail="Project status is required.")
        return None

    key = " ".join(normalized.lower().split())
    canonical = PROJECT_STATUS_ALIASES.get(key)
    
    res = canonical if canonical else (normalized if not strict else "In Progress")
    
    # 2. Date-based status override
    # If project end_date is today or in future, it CANNOT be COMPLETED
    if end_date and end_date >= dt_date.today() and res == "COMPLETED":
        return "In Progress"
        
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
    if normalized_status == "In Progress":
        if not normalized_sub:
            raise HTTPException(status_code=422, detail="sub_status is required when status is In Progress.")
    else:
        normalized_sub = None
    return normalized_status, normalized_sub


def _monday_of(date_value: date) -> date:
    """Return Monday of the week for the given date."""
    return date_value - timedelta(days=date_value.weekday())


def _iter_week_keys(start_date: date, end_date: Optional[date], max_weeks: int = 52):
    """
    Yield (year, week) tuples from the week containing start_date up to end_date (or horizon).
    Ensures we never generate an unbounded future list when end_date is open.
    """
    start_monday = _monday_of(start_date)
    final_date = end_date or (start_monday + timedelta(weeks=max_weeks))
    current = start_monday
    steps = 0
    while current <= final_date and steps < max_weeks:
        iso_year, iso_week, _ = current.isocalendar()
        yield iso_year, iso_week
        current += timedelta(weeks=1)
        steps += 1


def _normalize_week_key(raw_key, default_year: int) -> Optional[tuple]:
    """
    Accepts keys like 12 or '2026-12' and returns (year, week) tuple.
    """
    if raw_key in ("", None):
        return None
    try:
        if isinstance(raw_key, str) and "-" in raw_key:
            y_str, w_str = raw_key.split("-")
            return int(y_str), int(w_str)
        return default_year, int(raw_key)
    except Exception:
        return None


def _build_weekly_hours_from_pct(allocation_pct: int, alloc_start: date, alloc_end: Optional[date], overrides: Optional[dict] = None) -> dict:
    """
    Construct a weekly hours map keyed by (year, week) using allocation %.
    User-provided overrides (if any) take precedence.
    """
    hours_per_week = round((allocation_pct or 0) * HOURS_PER_FTE / 100, 2)
    weekly_map = {}

    if overrides:
        default_year = alloc_start.year if alloc_start else date.today().year
        for key, hrs in overrides.items():
            wk_key = _normalize_week_key(key, default_year)
            if wk_key and hrs not in ("", None):
                try:
                    weekly_map[wk_key] = float(hrs)
                except Exception:
                    continue

    if alloc_start:
        for y, w in _iter_week_keys(alloc_start, alloc_end):
            weekly_map.setdefault((y, w), hours_per_week)

    return weekly_map


def _fetch_existing_weekly_load(cur, employee_id: str, start_date: date, end_date: Optional[date], ignore_allocation_id: Optional[str] = None) -> dict:
    """
    Return a dict {(year, week): hours} representing the employee's existing load
    across all projects for the requested window. Used for capacity validation.
    """
    params = [employee_id]
    ignore_clause = ""
    if ignore_allocation_id:
        ignore_clause = " AND pa.allocation_id <> %s"
        params.append(ignore_allocation_id)

    cur.execute(f"""
        SELECT
            pa.allocation_id,
            pa.allocation_percentage,
            pa.allocation_start_date,
            pa.allocation_end_date,
            wa.allocation_year,
            wa.week_number,
            wa.allocated_hours
        FROM projects_allocation pa
        LEFT JOIN weekly_allocations wa ON pa.allocation_id = wa.allocation_id
        WHERE pa.employee_id = %s {ignore_clause}
    """, tuple(params))

    rows = cur.fetchall()
    weekly_load = {}
    alloc_meta = {}

    for r in rows:
        alloc_id = r[0]
        pct = r[1] or 0
        a_start = r[2] or start_date
        a_end = r[3]  # may be None
        w_year, w_num, w_hours = r[4], r[5], r[6]

        meta = alloc_meta.setdefault(alloc_id, {"pct": pct, "start": a_start, "end": a_end, "has_weeks": False})

        if w_year is not None and w_num is not None and w_hours is not None:
            weekly_load[(w_year, w_num)] = weekly_load.get((w_year, w_num), 0) + float(w_hours)
            meta["has_weeks"] = True

    # Fill missing weekly rows with flat distribution based on allocation % within the requested window
    for alloc_id, meta in alloc_meta.items():
        if meta["has_weeks"]:
            continue
        alloc_start = meta["start"] or start_date
        alloc_end = meta["end"] or end_date
        if not alloc_start:
            continue
        for y, w in _iter_week_keys(alloc_start, alloc_end, max_weeks=52):
            hours = round((meta["pct"] or 0) * HOURS_PER_FTE / 100, 2)
            weekly_load[(y, w)] = weekly_load.get((y, w), 0) + hours

    return weekly_load


def _available_capacity_pct(existing_weekly_load: dict) -> int:
    """
    Compute remaining % capacity based on the heaviest week in the provided load map.
    """
    if not existing_weekly_load:
        return 100
    max_hours = max(existing_weekly_load.values()) if existing_weekly_load else 0
    used_pct = (max_hours / HOURS_PER_FTE) * 100
    return max(0, int(round(100 - used_pct)))


def _validate_capacity(existing_weekly_load: dict, new_weekly_load: dict):
    """
    Validate that the new allocation itself does not exceed 40 hrs/week per project.
    Cross-project totals are allowed to exceed 40 hrs — an employee can work on
    multiple projects simultaneously (e.g. 50% Project A + 50% Project B + 25% Project C).
    The 40 hr cap here guards against a single project being allocated more than 100%.
    """
    today = date.today()
    today_iso = today.isocalendar()
    current_week = (today_iso[0], today_iso[1])
    over_weeks = []
    for wk, hours in new_weekly_load.items():
        # Skip past weeks — historical data cannot be changed; only future capacity matters
        if wk < current_week:
            continue
        # Only check the new project's own allocation — NOT the cross-project sum
        if hours > HOURS_PER_FTE + 1e-6:
            over_weeks.append(f"{wk[0]}-W{wk[1]:02d} ({hours}h)")
    if over_weeks:
        raise HTTPException(status_code=422, detail="A single project allocation cannot exceed 40 hrs/week (100%).")


def _capacity_snapshot(cur, employee_ids: list):
    """Return {employee_id: {"used_pct": x, "available_pct": y}} for active allocations."""
    if not employee_ids:
        return {}
    placeholders = ",".join(["%s"] * len(employee_ids))
    cur.execute(f"""
        SELECT employee_id, COALESCE(SUM(allocation_percentage), 0) AS used_pct
        FROM projects_allocation
        WHERE employee_id IN ({placeholders})
          AND (allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE)
        GROUP BY employee_id
    """, tuple(employee_ids))
    data = {}
    for emp_id, used_pct in cur.fetchall():
        used = float(used_pct or 0)
        data[str(emp_id)] = {"used_pct": used, "available_pct": max(0.0, 100.0 - used)}
    return data


def _build_weekly_distribution_for_rec(rec: dict, weeks_ahead: int = 12):
    """
    Build a compact week-by-week view starting from allocation_start_date.
    Unallocated weeks are shown as '-'.
    """
    try:
        alloc_start = datetime.strptime(rec.get("allocation_start_date"), "%Y-%m-%d").date() if rec.get("allocation_start_date") else date.today()
    except Exception:
        alloc_start = date.today()
    alloc_end = None
    if rec.get("allocation_end_date"):
        try:
            alloc_end = datetime.strptime(rec["allocation_end_date"], "%Y-%m-%d").date()
        except Exception:
            alloc_end = None
    horizon_weeks = weeks_ahead
    if alloc_end:
        total_weeks = max(1, int(((alloc_end - alloc_start).days // 7) + 1))
        horizon_weeks = max(horizon_weeks, total_weeks)

    base_hours = round((rec.get("allocation_percentage", 0) or 0) * HOURS_PER_FTE / 100, 2)
    explicit_weeks = {}
    for wk_key, hours in rec.get("weekly_hours", {}).items():
        explicit_weeks[wk_key] = hours

    distribution = {}
    for y, w in _iter_week_keys(alloc_start, alloc_end, max_weeks=horizon_weeks):
        key = f"{y}-{w:02d}"
        if alloc_end and _monday_of(date.fromisocalendar(y, w, 1)) > alloc_end:
            distribution[key] = "-"
            continue
        if key in explicit_weeks and explicit_weeks[key] > 0:
            distribution[key] = explicit_weeks[key]
        else:
            distribution[key] = base_hours if base_hours > 0 else "-"
    return distribution


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

        # Validate weekly_hours if provided
        if resource.weekly_hours:
            for wk_key, hours in resource.weekly_hours.items():
                wk_str = str(wk_key)
                if "-" in wk_str:
                    try:
                        wk_num = int(wk_str.split("-")[1])
                    except (ValueError, IndexError):
                        continue
                else:
                    try:
                        wk_num = int(wk_str)
                    except ValueError:
                        continue
                if not (1 <= wk_num <= 53):
                    raise HTTPException(status_code=422, detail=f"Resource row {idx}: week_number {wk_num} must be between 1 and 53.")
                if hours < 0 or hours > 40:
                    raise HTTPException(status_code=422, detail=f"Resource row {idx}: week {wk_num} hours must be between 0 and 40.")

        # Backward compat: validate old w1-w4 fields
        for week_field in ("w1", "w2", "w3", "w4"):
            hours = getattr(resource, week_field)
            if hours < 0 or hours > 168:
                raise HTTPException(status_code=422, detail=f"Resource row {idx}: {week_field} must be between 0 and 168.")


def _derive_project_tag(tm: TeamMemberCreate, project_billable: str) -> str:
    """Determine Billable/Non-Billable tag from billable_shadow field or project-level billable flag."""
    if tm.billable_shadow == "Shadow":
        return "Non-Billable"
    if tm.billable_shadow == "Billable":
        return "Billable"
    if tm.billable_shadow and "non" in tm.billable_shadow.lower():
        return "Non-Billable"
    # Fallback: derive from project-level flag
    return "Non-Billable" if "non" in (project_billable or "").lower() else "Billable"


def _compute_allocation_pct(tm: TeamMemberCreate) -> int:
    """Compute allocation percentage: explicit field > weekly_hours avg > w1-w4 avg."""
    if tm.allocation_pct is not None:
        return min(100, max(0, tm.allocation_pct))
    if tm.weekly_hours:
        non_zero = [h for h in tm.weekly_hours.values() if h > 0]
        if non_zero:
            avg = sum(non_zero) / len(non_zero)
            return min(100, int((avg / 40) * 100))
    # Backward compat: w1-w4
    hours_list = [h for h in [tm.w1, tm.w2, tm.w3, tm.w4] if h > 0]
    if hours_list:
        return min(100, int((sum(hours_list) / len(hours_list) / 40) * 100))
    return 0


def _get_project_week_numbers():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return [
        (monday - timedelta(weeks=i)).isocalendar()[1]
        for i in range(3, -1, -1)
    ]


def _resolve_employee_id(cur, tm: TeamMemberCreate):
    employee_id = _normalize_text(tm.employee_id)
    if employee_id:
        cur.execute(
            "SELECT employee_id FROM employee_master WHERE employee_id = %s LIMIT 1",
            (employee_id,)
        )
        emp_row = cur.fetchone()
        if emp_row:
            return emp_row[0]

    if tm.name:
        cur.execute(
            """
                SELECT employee_id FROM employee_master
                WHERE LOWER(employee_name) = LOWER(%s)
                LIMIT 1
            """,
            (_normalize_text(tm.name),)
        )
        emp_row = cur.fetchone()
        if emp_row:
            return emp_row[0]

    return None


def _build_resource_record(project_id: str, tm: TeamMemberCreate, allocation_id: str, employee_id: str, project_tag: str, allocation_pct: int, extra_meta: Optional[dict] = None):
    record = {
        "allocation_id": allocation_id,
        "employee_id": employee_id,
        "name": _normalize_text(tm.name),
        "role": _normalize_text(tm.role),
        "company": tm.company or "Cloud Destinations",
        "department": tm.department,
        "company_type": tm.company_type or "Internal",
        "location": tm.location or "Remote",
        "allocation_start_date": tm.allocation_start_date,
        "allocation_end_date": tm.allocation_end_date,
        "allocation_percentage": allocation_pct,
        "project_count": tm.project_count,
        "project_id": project_id,
        "project_tags": project_tag,
        "w1": tm.w1,
        "w2": tm.w2,
        "w3": tm.w3,
        "w4": tm.w4,
    }
    if extra_meta:
        record.update(extra_meta)
    return record


def _save_single_resource(cur, project_id: str, tm: TeamMemberCreate, project_billable: str, replace_allocation_id: Optional[str] = None, project_start: Optional[date] = None, project_end: Optional[date] = None, validate_capacity: bool = True):
    _validate_resource_rows([tm])

    employee_id = _resolve_employee_id(cur, tm)
    if not employee_id:
        raise HTTPException(
            status_code=422,
            detail=f"Resource '{tm.name}' does not exist in employee_master."
        )

    allocation_id = replace_allocation_id or _normalize_text(tm.allocation_id) or f"AL-{project_id}-{uuid.uuid4().hex[:12]}"
    alloc_start = _parse_optional_date(tm.allocation_start_date) or project_start or date.today()
    alloc_end = _parse_optional_date(tm.allocation_end_date) or project_end

    # Pull existing load to auto-suggest capacity and enforce validation
    existing_weekly_load = _fetch_existing_weekly_load(
        cur,
        employee_id,
        alloc_start,
        alloc_end,
        ignore_allocation_id=replace_allocation_id,
    )
    available_pct = _available_capacity_pct(existing_weekly_load)

    # Merge overrides from payload (weekly_hours + legacy w1-w4)
    overrides = dict(tm.weekly_hours or {})
    legacy_hours = [tm.w1, tm.w2, tm.w3, tm.w4]
    if any(h > 0 for h in legacy_hours):
        real_week_nums = _get_project_week_numbers()
        for idx, hours in enumerate(legacy_hours):
            if hours > 0:
                overrides[f"{alloc_start.year}-{real_week_nums[idx]}"] = hours

    # Choose allocation pct: explicit -> weekly avg -> remaining capacity
    requested_pct = _compute_allocation_pct(tm)
    if tm.allocation_pct is None and not tm.weekly_hours and not any(h > 0 for h in legacy_hours):
        allocation_pct = max(0, available_pct)
    else:
        allocation_pct = requested_pct

    # Build per-week distribution and validate against remaining capacity
    weekly_map = _build_weekly_hours_from_pct(allocation_pct, alloc_start, alloc_end, overrides=overrides)
    if not weekly_map and alloc_start:
        weekly_map = _build_weekly_hours_from_pct(allocation_pct, alloc_start, alloc_end, overrides=None)
    if validate_capacity:
        _validate_capacity(existing_weekly_load, weekly_map)

    project_tag = _derive_project_tag(tm, project_billable)

    if replace_allocation_id:
        cur.execute("DELETE FROM weekly_allocations WHERE allocation_id = %s", (replace_allocation_id,))
        cur.execute(
            "DELETE FROM projects_allocation WHERE allocation_id = %s AND project_id = %s",
            (replace_allocation_id, project_id)
        )

    cur.execute("""
        INSERT INTO projects_allocation (
            allocation_id, employee_id, project_id,
            role_in_project, allocation_percentage,
            allocation_start_date, allocation_end_date,
            project_tags, location
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        allocation_id,
        employee_id,
        project_id,
        tm.role,
        allocation_pct,
        alloc_start,
        alloc_end,
        project_tag,
        tm.location or "Remote",
    ))

    # Persist per-week hours
    for (w_year, w_num), hours in weekly_map.items():
        if hours <= 0:
            continue
        cur.execute("""
            INSERT INTO weekly_allocations (allocation_id, allocation_year, week_number, allocated_hours)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (allocation_id, allocation_year, week_number)
            DO UPDATE SET allocated_hours = EXCLUDED.allocated_hours
        """, (allocation_id, w_year, w_num, hours))

    capacity_status = "green"
    if available_pct <= 0:
        capacity_status = "red"
    elif available_pct < 20:
        capacity_status = "amber"

    return _build_resource_record(
        project_id,
        tm,
        allocation_id,
        employee_id,
        project_tag,
        allocation_pct,
        extra_meta={
            "available_capacity_pct": available_pct,
            "capacity_status": capacity_status,
            "weekly_hours_map": {f"{y}-{w:02d}": hrs for (y, w), hrs in weekly_map.items()}
        }
    )


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
def projects_overview(department: Optional[str] = None):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        where_clause = ""
        join_clause = ""
        params = []
        
        if department and department.lower() != 'all':
            join_clause = """
                JOIN projects_allocation pa ON p.project_id = pa.project_id
                JOIN employee_master em ON pa.employee_id = em.employee_id
            """
            where_clause = "AND em.department = %s"
            params = [department]

        cur.execute(f"""
            SELECT 
                COUNT(DISTINCT p.project_id) as total,
                COUNT(DISTINCT p.project_id) FILTER (
                    WHERE (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
                      AND LOWER(p.project_status) NOT IN ('not started', 'planned', 'upcoming')
                      AND (p.start_date IS NULL OR p.start_date <= CURRENT_DATE)
                ) as ongoing,
                COUNT(DISTINCT p.project_id) FILTER (
                    WHERE p.end_date < CURRENT_DATE
                ) as completed,
                COUNT(DISTINCT p.project_id) FILTER (
                    WHERE (LOWER(p.project_status) IN ('not started', 'planned', 'upcoming') OR p.start_date > CURRENT_DATE)
                      AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
                ) as upcoming,
                COUNT(DISTINCT p.project_id) FILTER (
                    WHERE LOWER(p.project_type) IN ('internal', 'poc')
                ) as internal,
                COUNT(DISTINCT p.project_id) FILTER (
                    WHERE LOWER(p.project_type) IN ('external', 'client')
                ) as external
            FROM projects p
            {join_clause}
            WHERE 1=1 {where_clause}
        """, tuple(params))
        
        row = cur.fetchone()

        return {
            "total_projects": row[0] or 0,
            "internal_projects": row[4] or 0,
            "external_projects": row[5] or 0,
            "ongoing_projects": row[1] or 0,
            "upcoming_projects": row[3] or 0,
            "completed_projects": row[2] or 0,
        }
    except Exception as e:
        print("PROJECTS OVERVIEW ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/list")
def projects_list(department: Optional[str] = None):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        where_clause = ""
        params = []
        if department and department.lower() != 'all':
            where_clause = """
                AND EXISTS (
                    SELECT 1 FROM projects_allocation pa_dept
                    JOIN employee_master em_dept ON pa_dept.employee_id = em_dept.employee_id
                    WHERE pa_dept.project_id = p.project_id
                      AND em_dept.department = %s
                )
            """
            params = [department]

        cur.execute(f"""
            SELECT
                p.project_id,
                p.project_name,
                p.project_status,
                p.project_type,
                p.start_date,
                p.end_date,
                (
                    SELECT COUNT(DISTINCT pa_all.employee_id)
                    FROM projects_allocation pa_all
                    WHERE pa_all.project_id = p.project_id
                      AND (pa_all.allocation_end_date IS NULL OR pa_all.allocation_end_date >= CURRENT_DATE)
                ) AS resource_count,
                (
                    SELECT JSON_AGG(json_row)
                    FROM (
                        SELECT JSON_BUILD_OBJECT('name', em2.employee_name, 'id', em2.employee_id, 'photo_url', em2.photo_url) AS json_row
                        FROM projects_allocation pa2
                        JOIN employee_master em2 ON pa2.employee_id = em2.employee_id
                        WHERE pa2.project_id = p.project_id
                          AND (pa2.allocation_end_date IS NULL OR pa2.allocation_end_date >= CURRENT_DATE)
                        ORDER BY pa2.allocation_percentage DESC
                        LIMIT 6
                    ) AS limited_members
                ) AS team_members,
                c.client_name,
                pr.partner_name,
                p.billable,
                p.client_id,
                p.partner_id
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.client_id
            LEFT JOIN partners pr ON p.partner_id = pr.partner_id
            {where_clause}
            GROUP BY p.project_id, p.project_name, p.project_status, p.project_type, p.start_date, p.end_date, c.client_name, pr.partner_name, p.billable, p.client_id, p.partner_id
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
                "resource_count": r[6],
                "team_members": r[7] if r[7] else [],
                "client_name": r[8],
                "partner_name": r[9],
                "billable": r[10] if r[10] else "Unknown",
                "client_id": r[11],
                "partner_id": r[12],
            }
            for r in results
        ]
    except Exception as e:
        print("PROJECTS LIST ERROR:", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
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
                c.client_name, pr.partner_name,
                pc.budget, pc.billing_type, pc.contract_type, pc.revenue_model, pc.commercial_notes,
                ps.objective, ps.deliverables, ps.milestones, ps.timeline_notes,
                p.client_id, p.partner_id, p.project_type
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.client_id
            LEFT JOIN partners pr ON p.partner_id = pr.partner_id
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
            "type": row[19]
        }
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{project_id}/details")
def update_project_details(project_id: str, details: ProjectDetailsUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE project_id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        start_date_val = None if not details.start_date or details.start_date in ['Not Set', 'TBD'] else details.start_date
        end_date_val = None if not details.end_date or details.end_date in ['Not Set', 'TBD'] else details.end_date

        # Update core projects
        cur.execute("""
            UPDATE projects SET
                start_date = COALESCE(%s, start_date),
                end_date = COALESCE(%s, end_date)
            WHERE project_id = %s
        """, (start_date_val, end_date_val, project_id))

        # Partial update for commercial details
        # We use INSERT ON CONFLICT to ensure the row exists, and COALESCE to keep existing data if current is None
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


@router.post("/{project_id}/resources")
def create_project_resource(project_id: str, payload: TeamMemberCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
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


@router.patch("/{project_id}/resources/{allocation_id}")
def update_project_resource(project_id: str, allocation_id: str, payload: TeamMemberCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
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


@router.delete("/{project_id}/resources/{allocation_id}")
def delete_project_resource(project_id: str, allocation_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM projects_allocation WHERE allocation_id = %s AND project_id = %s",
            (allocation_id, project_id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Allocation not found")

        cur.execute("DELETE FROM weekly_allocations WHERE allocation_id = %s", (allocation_id,))
        cur.execute(
            "DELETE FROM projects_allocation WHERE allocation_id = %s AND project_id = %s",
            (allocation_id, project_id)
        )
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
    resources = payload.resources or []
    title = _normalize_text(payload.title) or f"Resource Allocation - {project_id}"
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

    filename = f"Allocation_{project_id}_{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
            _save_single_resource(
                cur,
                project_id,
                tm,
                project_billable,
                replace_allocation_id=None,
                project_start=project_row[1],
                project_end=project_row[2],
                validate_capacity=False,
            )

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
        cur.execute("SELECT project_status FROM projects WHERE project_id = %s", (project_id,))
        current_row = cur.fetchone()
        if not current_row:
            raise HTTPException(status_code=404, detail="Project not found")
        current_status = current_row[0]

        payload = _model_payload(updates)
        if not payload:
            raise HTTPException(status_code=400, detail="No project fields were provided.")

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
            updates_map["project_status"] = normalized_status or _normalize_project_status(payload["project_status"])

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

        # Handle sub_status once
        if sub_status_value is not None or ("project_status" in payload):
            if (normalized_status or "").lower() == "in progress":
                updates_map["sub_status"] = normalized_sub_status
            else:
                updates_map["sub_status"] = None

        if not updates_map:
            raise HTTPException(status_code=400, detail="No valid project fields were provided.")

        print(f"UPDATING PROJECT {project_id} WITH:", updates_map)
        fields = [f"{col} = %s" for col in updates_map.keys()]
        values = list(updates_map.values())
        values.append(project_id)

        cur.execute(f"UPDATE projects SET {', '.join(fields)} WHERE project_id = %s", tuple(values))
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


@router.post("")
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
        insert_fields = ["project_id", "project_name", "project_status", "sub_status", "project_type", "billable", "start_date", "end_date"]
        insert_values = [
            project.project_id,
            project_name,
            project_status,
            sub_status_val,
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

        placeholders = ", ".join(["%s"] * len(insert_fields))
        cur.execute(f"INSERT INTO projects ({', '.join(insert_fields)}) VALUES ({placeholders})", tuple(insert_values))

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
