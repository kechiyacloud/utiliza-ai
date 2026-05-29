#!/usr/bin/env python3
"""
Bulk Project and Allocation Upload Utility for cd-utiliza-ai
Allows programmatically uploading projects and their allocations from CSV to PostgreSQL.
Includes robust dry-run validations, transactional safety, trigger support, and sync updates.
"""

import os
import sys
import csv
import argparse
from datetime import datetime, date
import psycopg2

# Add the backend directory to Python path to import app modules
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(backend_dir)

try:
    from app.database import get_db_connection, release_db_connection
    from app.routers.allocation_utils import (
        _build_weekly_hours_from_pct, _parse_optional_date
    )
    from app.routers.employees import _sync_employee_allocations
except ImportError as e:
    print(f"Error importing core application modules: {e}")
    print("Ensure you are running the script from the backend directory or have PYTHONPATH set correctly.")
    sys.exit(1)


def parse_date(date_str):
    """Parses date string or returns None if empty."""
    if not date_str or str(date_str).strip().lower() in ("null", "none", ""):
        return None
    try:
        return datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Invalid date format '{date_str}', must be YYYY-MM-DD")


def load_csv(file_path):
    """Loads CSV file and returns list of dictionaries."""
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' does not exist.")
        sys.exit(1)
        
    records = []
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        # Clean headers
        reader.fieldnames = [name.strip().lower() for name in reader.fieldnames if name]
        
        # Check mandatory headers
        required_headers = ['project_name', 'employee_id']
        missing = [h for h in required_headers if h not in reader.fieldnames]
        if missing:
            print(f"Error: Missing required columns in CSV: {', '.join(missing)}")
            sys.exit(1)
            
        for row in reader:
            # Strip spaces from keys and values
            clean_row = {k.strip().lower(): v.strip() if v else '' for k, v in row.items() if k}
            records.append(clean_row)
    return records


def _resolve_or_create_partner(cur, partner_name: str) -> str:
    name = partner_name.strip()
    cur.execute(
        "SELECT partner_id FROM partners WHERE LOWER(partner_name) = LOWER(%s) LIMIT 1;",
        (name,)
    )
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO partners (partner_name) VALUES (%s) RETURNING partner_id;",
        (name,)
    )
    return cur.fetchone()[0]


def _resolve_or_create_client(cur, client_name: str, partner_id=None) -> str:
    name = client_name.strip()
    if partner_id:
        cur.execute(
            "SELECT client_id FROM clients WHERE LOWER(client_name) = LOWER(%s) AND partner_id = %s LIMIT 1;",
            (name, partner_id)
        )
    else:
        cur.execute(
            "SELECT client_id FROM clients WHERE LOWER(client_name) = LOWER(%s) AND partner_id IS NULL LIMIT 1;",
            (name,)
        )
    row = cur.fetchone()
    if row:
        return row[0]
    if partner_id:
        cur.execute(
            "INSERT INTO clients (client_name, partner_id) VALUES (%s, %s) RETURNING client_id;",
            (name, partner_id)
        )
    else:
        cur.execute(
            "INSERT INTO clients (client_name) VALUES (%s) RETURNING client_id;",
            (name,)
        )
    return cur.fetchone()[0]


def _resolve_or_create_department(cur, department_name: str) -> str:
    name = " ".join(department_name.split())
    cur.execute(
        "SELECT department_id FROM departments WHERE LOWER(department_name) = LOWER(%s) LIMIT 1;",
        (name,)
    )
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO departments (department_name) VALUES (%s) RETURNING department_id;",
        (name,)
    )
    return cur.fetchone()[0]


def validate_records(cur, records):
    """Performs rigorous dry-run validations on all records to guarantee zero runtime database errors."""
    print("Starting pre-validation checks...")
    errors = []
    valid_employees = {}  # Cache resolved employee IDs
    
    # 1. Fetch valid clients, partners, and departments to validate foreign keys
    cur.execute("SELECT client_id, LOWER(client_name) FROM clients;")
    clients = {row[0]: row[1] for row in cur.fetchall()}
    
    cur.execute("SELECT partner_id, LOWER(partner_name) FROM partners;")
    partners = {row[0]: row[1] for row in cur.fetchall()}
    
    cur.execute("SELECT department_id, LOWER(department_name) FROM departments;")
    departments = {row[0]: row[1] for row in cur.fetchall()}

    for idx, row in enumerate(records, start=2):  # Row 1 is header
        row_errors = []
        p_name = row.get('project_name', '').strip()
        p_type = row.get('project_type', 'Client').strip().capitalize()
        p_status = row.get('project_status', 'Active').strip().capitalize()
        billable = row.get('billable', 'Billable').strip()
        start_date_str = row.get('start_date', '').strip()
        end_date_str = row.get('end_date', '').strip()
        client_id = row.get('client_id', '').strip()
        partner_id = row.get('partner_id', '').strip()
        dept_id = row.get('department_id', '').strip()
        
        emp_ref = row.get('employee_id', '').strip()
        role = row.get('role_in_project', 'Developer').strip()
        alloc_pct_str = row.get('allocation_percentage', '100').strip()
        alloc_start_str = row.get('allocation_start_date', start_date_str).strip()
        alloc_end_str = row.get('allocation_end_date', end_date_str).strip()
        
        # Validate Project Name
        if not p_name:
            row_errors.append("Project Name is mandatory.")
            
        # Validate Project Type
        if p_type not in ('Client', 'Partner', 'Internal'):
            row_errors.append(f"Invalid Project Type '{p_type}'. Must be Client, Partner, or Internal.")
            
        # Validate Client — accept ID or name (name triggers auto-create at upload time)
        if p_type == 'Client':
            if client_id:
                if client_id not in clients:
                    row_errors.append(f"Client ID '{client_id}' does not exist in clients table.")
            elif client_name_val := row.get('client_name', '').strip():
                row['_resolve_client_by_name'] = True
            else:
                row_errors.append("Provide client_id or client_name for Client projects.")

        # Validate Partner — accept ID or name (name triggers auto-create at upload time)
        if p_type == 'Partner':
            if partner_id:
                if partner_id not in partners:
                    row_errors.append(f"Partner ID '{partner_id}' does not exist in partners table.")
            elif partner_name_val := row.get('partner_name', '').strip():
                row['_resolve_partner_by_name'] = True
            else:
                row_errors.append("Provide partner_id or partner_name for Partner projects.")
                
        # Validate Department — accept ID or name (name triggers auto-create at upload time)
        if dept_id:
            if dept_id not in departments:
                row_errors.append(f"Department ID '{dept_id}' does not exist in departments table.")
        elif dept_name_val := row.get('department_name', '').strip():
            row['_resolve_department_by_name'] = True
            
        # Validate Project Dates
        p_start, p_end = None, None
        try:
            p_start = parse_date(start_date_str)
        except ValueError as ve:
            row_errors.append(f"Project Start Date error: {ve}")
            
        try:
            p_end = parse_date(end_date_str)
        except ValueError as ve:
            row_errors.append(f"Project End Date error: {ve}")
            
        if p_start and p_end and p_end < p_start:
            row_errors.append(f"Project End Date ({p_end}) cannot be before Start Date ({p_start}).")
            
        # Validate Employee Reference (ID or Email)
        if not emp_ref:
            row_errors.append("Employee ID / Email is mandatory for allocation.")
        else:
            if emp_ref in valid_employees:
                resolved_emp_id = valid_employees[emp_ref]
            else:
                # Search by ID or Email
                cur.execute(
                    "SELECT employee_id FROM employee_master WHERE employee_id = %s OR LOWER(email_id) = LOWER(%s) LIMIT 1;",
                    (emp_ref, emp_ref)
                )
                emp_row = cur.fetchone()
                if emp_row:
                    resolved_emp_id = emp_row[0]
                    valid_employees[emp_ref] = resolved_emp_id
                else:
                    resolved_emp_id = None
                    row_errors.append(f"Employee ID / Email '{emp_ref}' does not exist in employee_master table.")
                    
        # Validate Allocation %
        try:
            alloc_pct = int(float(alloc_pct_str)) if alloc_pct_str else 100
            if not (0 <= alloc_pct <= 100):
                row_errors.append(f"Allocation percentage must be between 0 and 100 (got {alloc_pct}).")
        except ValueError:
            row_errors.append(f"Allocation percentage '{alloc_pct_str}' must be a numeric value.")
            
        # Validate Allocation Dates
        a_start, a_end = None, None
        try:
            a_start = parse_date(alloc_start_str) or p_start
        except ValueError as ve:
            row_errors.append(f"Allocation Start Date error: {ve}")
            
        try:
            a_end = parse_date(alloc_end_str) or p_end
        except ValueError as ve:
            row_errors.append(f"Allocation End Date error: {ve}")
            
        if a_start and a_end and a_end < a_start:
            row_errors.append(f"Allocation End Date ({a_end}) cannot be before Start Date ({a_start}).")

        if row_errors:
            errors.append({"row": idx, "errors": row_errors, "project": p_name, "employee": emp_ref})
            
    return errors, valid_employees


def upload_records(cur, records, resolved_employees):
    """Executes database insertions and updates inside a transactional block."""
    print("\nExecuting database updates...")
    
    project_cache = {}  # Cache resolved or inserted project_ids: {(name, client_id): project_id}
    affected_employee_ids = set()
    
    for idx, row in enumerate(records, start=2):
        # Auto-create partner/client by name when IDs not supplied
        if row.get('_resolve_partner_by_name'):
            row['partner_id'] = _resolve_or_create_partner(cur, row.get('partner_name', ''))
        if row.get('_resolve_client_by_name'):
            row['client_id'] = _resolve_or_create_client(
                cur, row.get('client_name', ''), row.get('partner_id') or None
            )
        if row.get('_resolve_department_by_name'):
            row['department_id'] = _resolve_or_create_department(cur, row.get('department_name', ''))

        p_name = row.get('project_name', '').strip()
        p_type = row.get('project_type', 'Client').strip().capitalize()
        p_status = row.get('project_status', 'Active').strip().capitalize()
        billable = row.get('billable', 'Billable').strip()
        start_date_str = row.get('start_date', '').strip()
        end_date_str = row.get('end_date', '').strip()
        client_id = row.get('client_id', '').strip() or None
        partner_id = row.get('partner_id', '').strip() or None
        dept_id = row.get('department_id', '').strip() or None
        
        emp_ref = row.get('employee_id', '').strip()
        role = row.get('role_in_project', 'Developer').strip()
        alloc_pct = int(float(row.get('allocation_percentage', '100').strip()))
        alloc_start = parse_date(row.get('allocation_start_date', '').strip()) or parse_date(start_date_str) or date.today()
        alloc_end = parse_date(row.get('allocation_end_date', '').strip()) or parse_date(end_date_str)
        loc = row.get('location', 'Remote').strip()
        proj_tags = row.get('project_tags', billable).strip()
        
        resolved_emp_id = resolved_employees[emp_ref]
        affected_employee_ids.add(resolved_emp_id)
        
        # 1. Resolve or Insert Project
        proj_key = (p_name.lower(), client_id)
        if proj_key in project_cache:
            project_id = project_cache[proj_key]
        else:
            # Check if project already exists in DB
            if client_id:
                cur.execute(
                    "SELECT project_id, billable, start_date, end_date FROM projects WHERE LOWER(project_name) = LOWER(%s) AND client_id = %s LIMIT 1;",
                    (p_name, client_id)
                )
            else:
                cur.execute(
                    "SELECT project_id, billable, start_date, end_date FROM projects WHERE LOWER(project_name) = LOWER(%s) AND client_id IS NULL LIMIT 1;",
                    (p_name,)
                )
                
            exist_proj = cur.fetchone()
            if exist_proj:
                project_id = exist_proj[0]
                project_cache[proj_key] = project_id
                print(f"[Row {idx}] Found existing project: '{p_name}' ({project_id})")
            else:
                # Insert project, let trigger generate project_id
                insert_fields = ["project_name", "project_status", "project_type", "billable", "start_date", "end_date"]
                insert_values = [
                    p_name,
                    p_status,
                    p_type,
                    "Non-Billable" if p_type == 'Internal' else billable,
                    parse_date(start_date_str),
                    parse_date(end_date_str),
                ]
                
                if client_id:
                    insert_fields.append("client_id")
                    insert_values.append(client_id)
                if partner_id:
                    insert_fields.append("partner_id")
                    insert_values.append(partner_id)
                if dept_id:
                    insert_fields.append("department_id")
                    insert_values.append(dept_id)
                    
                placeholders = ", ".join(["%s"] * len(insert_fields))
                query = f"INSERT INTO projects ({', '.join(insert_fields)}) VALUES ({placeholders}) RETURNING project_id;"
                cur.execute(query, tuple(insert_values))
                
                project_id = cur.fetchone()[0]
                project_cache[proj_key] = project_id
                print(f"[Row {idx}] Created new project: '{p_name}' -> ID: {project_id}")
                
        # 2. Resolve or Insert/Update Allocation
        cur.execute(
            "SELECT allocation_id, allocation_percentage FROM projects_allocation WHERE employee_id = %s AND project_id = %s LIMIT 1;",
            (resolved_emp_id, project_id)
        )
        exist_alloc = cur.fetchone()
        
        # Format tags matching derive logic
        status_tag = proj_tags.strip().capitalize()
        normalized_tag = "Non-Billable" if "non" in status_tag.lower() or status_tag == "Shadow" else "Billable"
        
        if exist_alloc:
            allocation_id = exist_alloc[0]
            print(f"[Row {idx}] Updating allocation for employee '{emp_ref}' on project '{p_name}' ({allocation_id})")
            
            # Wipe existing weekly hours before re-computing
            cur.execute("DELETE FROM weekly_allocations WHERE allocation_id = %s;", (allocation_id,))
            
            cur.execute("""
                UPDATE projects_allocation SET
                    role_in_project = %s,
                    allocation_percentage = %s,
                    allocation_start_date = %s,
                    allocation_end_date = %s,
                    project_tags = %s,
                    location = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE allocation_id = %s;
            """, (role, alloc_pct, alloc_start, alloc_end, normalized_tag, loc, allocation_id))
        else:
            # Let default sequence handle allocation_id
            print(f"[Row {idx}] Creating new allocation for employee '{emp_ref}' on project '{p_name}'")
            cur.execute("""
                INSERT INTO projects_allocation (
                    employee_id, project_id, role_in_project, allocation_percentage,
                    allocation_start_date, allocation_end_date, project_tags, location
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING allocation_id;
            """, (resolved_emp_id, project_id, role, alloc_pct, alloc_start, alloc_end, normalized_tag, loc))
            allocation_id = cur.fetchone()[0]
            print(f"      Allocation ID generated: {allocation_id}")
            
        # 3. Generate and Insert Weekly Allocations
        weekly_map = _build_weekly_hours_from_pct(alloc_pct, alloc_start, alloc_end, overrides=None)
        inserted_weeks = 0
        for (w_year, w_num), hours in weekly_map.items():
            if hours <= 0:
                continue
            cur.execute("""
                INSERT INTO weekly_allocations (allocation_id, allocation_year, week_number, allocated_hours)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (allocation_id, allocation_year, week_number)
                DO UPDATE SET allocated_hours = EXCLUDED.allocated_hours;
            """, (allocation_id, w_year, w_num, hours))
            inserted_weeks += 1
            
        print(f"      Generated {inserted_weeks} weekly allocation records.")
        
    # 4. Synchronize all affected employees (Capacity and status calculations)
    if affected_employee_ids:
        print(f"\nSynchronizing capacities and statuses for {len(affected_employee_ids)} affected resources...")
        _sync_employee_allocations(cur, affected_employee_ids)
        print("Synchronization completed successfully.")


def main():
    parser = argparse.ArgumentParser(description="Bulk upload projects and allocations programmatically from CSV.")
    parser.add_argument("file_path", nargs="?", default="bulk_upload_template.csv", help="Path to the CSV file (default: bulk_upload_template.csv)")
    
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--commit", action="store_true", help="Execute the upload and commit updates to database")
    group.add_argument("--dry-run", action="store_true", default=True, help="Perform checks and print summary but do not write changes (default behavior)")
    
    args = parser.parse_args()
    
    # If neither is explicitly passed, let it default to dry-run
    is_dry_run = not args.commit
    
    print("=" * 60)
    print("BULK PROJECT & ALLOCATION UPLOAD UTILITY".center(60))
    print("=" * 60)
    print(f"File Path: {args.file_path}")
    print(f"Mode: {'DRY RUN (ReadOnly)' if is_dry_run else 'LIVE COMMIT (WriteToDB)'}")
    print("=" * 60)
    
    records = load_csv(args.file_path)
    print(f"Loaded {len(records)} records from CSV.")
    
    # Establish connection
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Perform dry run validations first
        errors, resolved_employees = validate_records(cur, records)
        
        if errors:
            print("\n" + "!" * 60)
            print("PRE-VALIDATION FAILED - UPLOAD ABORTED".center(60))
            print("!" * 60)
            for err in errors:
                print(f"\n[Row {err['row']}] Project: '{err['project']}', Employee: '{err['employee']}'")
                for e_msg in err['errors']:
                    print(f"  - ERROR: {e_msg}")
            print("\nPlease correct the spreadsheet and try again.")
            sys.exit(1)
            
        print("\nPre-validation checks PASSED! Data is clean.")
        
        if is_dry_run:
            # Even in dry run, let's run the upload inside a transaction and roll it back
            # to verify no database database-level constraint errors occur.
            print("\nSimulating database writes in transaction block (dry run test)...")
            upload_records(cur, records, resolved_employees)
            print("\nDry run transaction simulation completed successfully without errors!")
            print("Rolling back simulation transaction.")
            conn.rollback()
            print("=" * 60)
            print("Dry Run complete! Run with '--commit' to upload changes to the database.".center(60))
            print("=" * 60)
        else:
            print("\nExecuting live database writes in transaction...")
            upload_records(cur, records, resolved_employees)
            print("\nCommitting changes to database...")
            conn.commit()
            print("=" * 60)
            print("BULK UPLOAD COMPLETED SUCCESSFULLY AND COMMITTED!".center(60))
            print("=" * 60)
            
    except Exception as e:
        print("\n" + "X" * 60)
        print("DATABASE ERROR OCCURRED - ROLLING BACK TRANSACTION".center(60))
        print("X" * 60)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        try:
            conn.rollback()
            print("Transaction rolled back successfully.")
        except Exception as rollback_err:
            print(f"Failed to rollback transaction: {rollback_err}")
        sys.exit(1)
    finally:
        cur.close()
        release_db_connection(conn)


if __name__ == '__main__':
    main()
