from datetime import date, datetime, timedelta
import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from fastapi import HTTPException
from app.routers.employees import _sync_employee_allocations

HOURS_PER_FTE = 40

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
                cleaned[wk_str] = hours_val
            else:
                cleaned[int(wk_str)] = hours_val
        return cleaned

def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None

def _parse_optional_date(value: Optional[str]):
    if not value or str(value).strip().lower() in ("null", "none", ""):
        return None
    try:
        if isinstance(value, date):
            return value
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except Exception:
        return None

def _monday_of(date_value: date) -> date:
    """Return Monday of the week for the given date."""
    return date_value - timedelta(days=date_value.weekday())

def _iter_week_keys(start_date: date, end_date: Optional[date], max_weeks: int = 52):
    """
    Yield (year, week) tuples from the week containing start_date up to end_date (or horizon).
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

def _weekday_overlap_count(week_monday: date, alloc_start: date, alloc_end: Optional[date]) -> int:
    """Count Mon–Fri days of the ISO week starting `week_monday` that fall within
    [alloc_start, alloc_end]. alloc_end=None means open-ended."""
    count = 0
    for offset in range(5):
        day = week_monday + timedelta(days=offset)
        if day < alloc_start:
            continue
        if alloc_end is not None and day > alloc_end:
            continue
        count += 1
    return count

def _normalize_week_key(raw_key, default_year: int) -> Optional[tuple]:
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
    full_week_hours = (allocation_pct or 0) * HOURS_PER_FTE / 100
    per_day_hours = full_week_hours / 5
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
            week_monday = date.fromisocalendar(y, w, 1)
            workdays = _weekday_overlap_count(week_monday, alloc_start, alloc_end)
            prorated = round(per_day_hours * workdays, 2)
            weekly_map.setdefault((y, w), prorated)
    return weekly_map

def _fetch_existing_weekly_load(cur, employee_id: str, start_date: date, end_date: Optional[date], ignore_allocation_id: Optional[str] = None) -> dict:
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
        JOIN projects pj ON pa.project_id = pj.project_id
        LEFT JOIN weekly_allocations wa ON pa.allocation_id = wa.allocation_id
        WHERE pa.employee_id = %s {ignore_clause}
          AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
    """, tuple(params))
    rows = cur.fetchall()
    weekly_load = {}
    alloc_meta = {}
    for r in rows:
        alloc_id = r[0]
        pct = r[1] or 0
        a_start = r[2] or start_date
        a_end = r[3]
        w_year, w_num, w_hours = r[4], r[5], r[6]
        meta = alloc_meta.setdefault(alloc_id, {"pct": pct, "start": a_start, "end": a_end, "has_weeks": False})
        if w_year is not None and w_num is not None and w_hours is not None:
            weekly_load[(w_year, w_num)] = weekly_load.get((w_year, w_num), 0) + float(w_hours)
            meta["has_weeks"] = True
    for alloc_id, meta in alloc_meta.items():
        if meta["has_weeks"]:
            continue
        alloc_start = meta["start"] or start_date
        alloc_end = meta["end"] or end_date
        if not alloc_start:
            continue
        full_week_hours = (meta["pct"] or 0) * HOURS_PER_FTE / 100
        per_day_hours = full_week_hours / 5
        for y, w in _iter_week_keys(alloc_start, alloc_end, max_weeks=52):
            week_monday = date.fromisocalendar(y, w, 1)
            workdays = _weekday_overlap_count(week_monday, alloc_start, alloc_end)
            hours = round(per_day_hours * workdays, 2)
            if hours > 0:
                weekly_load[(y, w)] = weekly_load.get((y, w), 0) + hours
    return weekly_load

def _available_capacity_pct(existing_weekly_load: dict) -> int:
    if not existing_weekly_load:
        return 100
    max_hours = max(existing_weekly_load.values()) if existing_weekly_load else 0
    used_pct = (max_hours / HOURS_PER_FTE) * 100
    return max(0, int(round(100 - used_pct)))

def _validate_capacity(existing_weekly_load: dict, new_weekly_load: dict):
    today = date.today()
    today_iso = today.isocalendar()
    current_week = (today_iso[0], today_iso[1])
    over_weeks = []
    for wk, hours in new_weekly_load.items():
        if wk < current_week:
            continue
        if hours > HOURS_PER_FTE + 1e-6:
            over_weeks.append(f"{wk[0]}-W{wk[1]:02d} ({hours}h)")
    if over_weeks:
        raise HTTPException(status_code=422, detail="A single project allocation cannot exceed 40 hrs/week (100%).")

def _capacity_snapshot(cur, employee_ids: list):
    if not employee_ids:
        return {}
    placeholders = ",".join(["%s"] * len(employee_ids))
    cur.execute(f"""
        SELECT employee_id, COALESCE(SUM(allocation_percentage), 0) AS used_pct
        FROM projects_allocation pa
        JOIN projects pj ON pa.project_id = pj.project_id
        WHERE pa.employee_id IN ({placeholders})
          AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
          AND COALESCE(LOWER(pj.project_status), '') NOT IN ('end', 'ended', 'completed', 'cancelled', 'on hold')
        GROUP BY pa.employee_id
    """, tuple(employee_ids))
    data = {}
    for emp_id, used_pct in cur.fetchall():
        used = float(used_pct or 0)
        data[str(emp_id)] = {"used_pct": used, "available_pct": max(0.0, 100.0 - used)}
    return data

def _build_weekly_distribution_for_rec(rec: dict, weeks_ahead: int = 12):
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
    full_week_hours = (rec.get("allocation_percentage", 0) or 0) * HOURS_PER_FTE / 100
    per_day_hours = full_week_hours / 5
    explicit_weeks = {}
    for wk_key, hours in rec.get("weekly_hours", {}).items():
        explicit_weeks[wk_key] = hours
    distribution = {}
    for y, w in _iter_week_keys(alloc_start, alloc_end, max_weeks=horizon_weeks):
        key = f"{y}-{w:02d}"
        week_monday = date.fromisocalendar(y, w, 1)
        if alloc_end and week_monday > alloc_end:
            distribution[key] = "-"
            continue
        if key in explicit_weeks and explicit_weeks[key] > 0:
            distribution[key] = explicit_weeks[key]
        else:
            workdays = _weekday_overlap_count(week_monday, alloc_start, alloc_end)
            prorated = round(per_day_hours * workdays, 2)
            distribution[key] = prorated if prorated > 0 else "-"
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
        for week_field in ("w1", "w2", "w3", "w4"):
            hours = getattr(resource, week_field)
            if hours < 0 or hours > 168:
                raise HTTPException(status_code=422, detail=f"Resource row {idx}: {week_field} must be between 0 and 168.")

def _derive_project_tag(tm: TeamMemberCreate, project_billable: str) -> str:
    """Determine Billable/Non-Billable tag. Normalizes 'Shadow' or 'Non-billable' to 'Non-Billable'."""
    status = (tm.billable_shadow or "").strip().lower()
    if status == "billable":
        return "Billable"
    if "non" in status or status == "shadow":
        return "Non-Billable"
    # Fallback to project-level flag
    return "Non-Billable" if "non" in (project_billable or "").lower() else "Billable"

def _compute_allocation_pct(tm: TeamMemberCreate) -> int:
    if tm.allocation_pct is not None:
        return min(100, max(0, tm.allocation_pct))
    if tm.weekly_hours:
        non_zero = [h for h in tm.weekly_hours.values() if h > 0]
        if non_zero:
            avg = sum(non_zero) / len(non_zero)
            return min(100, int((avg / 40) * 100))
    hours_list = [h for h in [tm.w1, tm.w2, tm.w3, tm.w4] if h > 0]
    if hours_list:
        return min(100, int((sum(hours_list) / len(hours_list) / 40) * 100))
    return 0

def _get_project_week_numbers():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return [ (monday - timedelta(weeks=i)).isocalendar()[1] for i in range(3, -1, -1) ]

def _resolve_employee_id(cur, tm: TeamMemberCreate):
    employee_id = _normalize_text(tm.employee_id)
    if employee_id:
        # Check both ID and Email
        cur.execute(
            "SELECT employee_id FROM employee_master WHERE employee_id = %s OR LOWER(email_id) = LOWER(%s) LIMIT 1",
            (employee_id, employee_id)
        )
        emp_row = cur.fetchone()
        if emp_row: return emp_row[0]

    if tm.name:
        cur.execute(
            "SELECT employee_id FROM employee_master WHERE LOWER(employee_name) = LOWER(%s) LIMIT 1",
            (_normalize_text(tm.name),)
        )
        emp_row = cur.fetchone()
        if emp_row: return emp_row[0]
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
        "w1": tm.w1, "w2": tm.w2, "w3": tm.w3, "w4": tm.w4,
    }
    if extra_meta: record.update(extra_meta)
    return record

def _save_single_resource(cur, project_id: str, tm: TeamMemberCreate, project_billable: str, replace_allocation_id: Optional[str] = None, project_start: Optional[date] = None, project_end: Optional[date] = None, validate_capacity: bool = True):
    _validate_resource_rows([tm])
    employee_id = _resolve_employee_id(cur, tm)
    if not employee_id:
        raise HTTPException(status_code=422, detail=f"Resource '{tm.name}' does not exist in employee_master.")

    allocation_id = replace_allocation_id or _normalize_text(tm.allocation_id) or f"AL-{project_id}-{uuid.uuid4().hex[:12]}"
    alloc_start = _parse_optional_date(tm.allocation_start_date) or project_start or date.today()
    alloc_end = _parse_optional_date(tm.allocation_end_date) or project_end

    existing_weekly_load = _fetch_existing_weekly_load(cur, employee_id, alloc_start, alloc_end, ignore_allocation_id=replace_allocation_id)
    available_pct = _available_capacity_pct(existing_weekly_load)

    overrides = dict(tm.weekly_hours or {})
    legacy_hours = [tm.w1, tm.w2, tm.w3, tm.w4]
    if any(h > 0 for h in legacy_hours):
        real_week_nums = _get_project_week_numbers()
        for idx, hours in enumerate(legacy_hours):
            if hours > 0: overrides[f"{alloc_start.year}-{real_week_nums[idx]}"] = hours

    requested_pct = _compute_allocation_pct(tm)
    if tm.allocation_pct is None and not tm.weekly_hours and not any(h > 0 for h in legacy_hours):
        allocation_pct = max(0, available_pct)
    else:
        allocation_pct = requested_pct

    weekly_map = _build_weekly_hours_from_pct(allocation_pct, alloc_start, alloc_end, overrides=overrides)
    if not weekly_map and alloc_start:
        weekly_map = _build_weekly_hours_from_pct(allocation_pct, alloc_start, alloc_end, overrides=None)
    if validate_capacity:
        _validate_capacity(existing_weekly_load, weekly_map)

    project_tag = _derive_project_tag(tm, project_billable)

    if replace_allocation_id:
        cur.execute("DELETE FROM weekly_allocations WHERE allocation_id = %s", (replace_allocation_id,))
        cur.execute("DELETE FROM projects_allocation WHERE allocation_id = %s AND project_id = %s", (replace_allocation_id, project_id))

    cur.execute("""
        INSERT INTO projects_allocation (
            allocation_id, employee_id, project_id,
            role_in_project, allocation_percentage,
            allocation_start_date, allocation_end_date,
            project_tags, location
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (allocation_id, employee_id, project_id, tm.role, allocation_pct, alloc_start, alloc_end, project_tag, tm.location or "Remote"))

    for (w_year, w_num), hours in weekly_map.items():
        if hours <= 0: continue
        cur.execute("""
            INSERT INTO weekly_allocations (allocation_id, allocation_year, week_number, allocated_hours)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (allocation_id, allocation_year, week_number)
            DO UPDATE SET allocated_hours = EXCLUDED.allocated_hours
        """, (allocation_id, w_year, w_num, hours))

    # Trigger cross-module synchronization for total percentage consistency
    _sync_employee_allocations(cur, {employee_id})

    return _build_resource_record(project_id, tm, allocation_id, employee_id, project_tag, allocation_pct, extra_meta={"available_capacity_pct": available_pct})
