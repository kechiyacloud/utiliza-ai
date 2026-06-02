import re
from datetime import datetime
from db import get_db_connection
from zoho_api import fetch_employees

def clean_str(value):
    if value is None:
        return None
    s = str(value).strip()
    return None if s in ("", "N/A", "null", "NULL", "None", "-") else s

def parse_phone(value):
    s = clean_str(value)
    if not s:
        return None
    # Strip non-numeric characters
    numeric = re.sub(r'\D', '', s)
    if numeric:
        return int(numeric)
    return None

def parse_date(value):
    s = clean_str(value)
    if not s:
        return None
    try:
        # e.g., '27-Apr-2026'
        dt = datetime.strptime(s, "%d-%b-%Y")
        return dt.date()
    except ValueError:
        return None

def extract_manager_id(reporting_to_str):
    s = clean_str(reporting_to_str)
    if not s:
        return None
    # Usually format is "Name ID", like "Ranju Baby CD-CJB01-00289"
    # We grab the last word which is the ID
    parts = s.split()
    if parts:
        return parts[-1]
    return None

def sync_employees():
    print("Fetching employees from Zoho...")
    try:
        raw_employees = fetch_employees()
    except Exception as e:
        print(f"Error fetching employees: {e}")
        return

    print(f"Retrieved {len(raw_employees)} records. Processing...")
    
    conn = get_db_connection()
    cur = conn.cursor()

    # Pre-sync check: Check if Victoria Jenifer D. Jayaraj already exists in local DB
    cur.execute("SELECT 1 FROM public.employee_master WHERE LOWER(employee_name) LIKE %s OR LOWER(email_id) = %s OR employee_id = %s",
                ('%victoria jenifer%', 'jenniferv@clouddestinations.com', 'CD-CJB01-00067'))
    victoria_already_in_db = cur.fetchone() is not None
    print(f"Victoria Jenifer D. Jayaraj already in database: {victoria_already_in_db}")

    master_query = """
        INSERT INTO public.employee_master (
            employee_id, employee_name, phone_number, email_id, location,
            date_of_joining, role_designation, department, employee_type,
            total_experience, photo_url
        ) VALUES (
            %(employee_id)s, %(employee_name)s, %(phone_number)s, %(email_id)s, %(location)s,
            %(date_of_joining)s, %(role_designation)s, %(department)s, %(employee_type)s,
            %(total_experience)s, %(photo_url)s
        ) ON CONFLICT (employee_id) DO UPDATE SET
            employee_name = EXCLUDED.employee_name,
            phone_number = EXCLUDED.phone_number,
            email_id = EXCLUDED.email_id,
            location = EXCLUDED.location,
            date_of_joining = EXCLUDED.date_of_joining,
            role_designation = EXCLUDED.role_designation,
            department = EXCLUDED.department,
            employee_type = EXCLUDED.employee_type,
            total_experience = EXCLUDED.total_experience,
            photo_url = EXCLUDED.photo_url,
            updated_at = CURRENT_TIMESTAMP
    """

    pro_query = """
        INSERT INTO public.employee_master_pro (
            employee_id, reporting_manager_id, employee_status
        ) VALUES (
            %(employee_id)s, %(reporting_manager_id)s, %(employee_status)s
        ) ON CONFLICT (employee_id) DO UPDATE SET
            reporting_manager_id = EXCLUDED.reporting_manager_id,
            employee_status = EXCLUDED.employee_status
    """

    processed = 0
    errors = 0

    for emp in raw_employees:
        emp_id = clean_str(emp.get("EmployeeID"))
        if not emp_id:
            # Cannot insert without PK
            continue
            
        first_name = clean_str(emp.get("FirstName")) or ""
        last_name = clean_str(emp.get("LastName")) or ""
        emp_name = f"{first_name} {last_name}".strip()
        
        email = clean_str(emp.get("EmailID"))
        if not email:
            print(f"Skipping {emp_id} due to missing email")
            continue

        # Check if email exists in DB with a different ID to match Zoho employee ID
        cur.execute("SELECT employee_id FROM public.employee_master WHERE LOWER(TRIM(email_id)) = LOWER(TRIM(%s))", (email,))
        row = cur.fetchone()
        if row and row[0] != emp_id:
            old_id = row[0]
            print(f"Updating employee ID for {emp_name} to match Zoho ID: {old_id} -> {emp_id}")
            cur.execute("UPDATE public.employee_master SET employee_id = %s WHERE employee_id = %s", (emp_id, old_id))

        exp_str = clean_str(emp.get("total_experience"))
        try:
            # Zoho API returns total_experience in months; convert to years
            exp = round(float(exp_str) / 12.0, 2) if exp_str else 0.0
        except ValueError:
            exp = 0.0

        phone = parse_phone(emp.get("Mobile"))
        if phone:
            cur.execute("SELECT employee_id, employee_name FROM public.employee_master WHERE phone_number = %s AND employee_id != %s", (phone, emp_id))
            dup = cur.fetchone()
            if dup:
                print(f"Warning: Phone number {phone} for {emp_name} ({emp_id}) is a duplicate of {dup[1]} ({dup[0]}). Setting to NULL to avoid constraint violation.")
                phone = None

        master_data = {
            "employee_id": emp_id,
            "employee_name": emp_name,
            "phone_number": phone,
            "email_id": email,
            "location": clean_str(emp.get("LocationName")),
            "date_of_joining": parse_date(emp.get("Dateofjoining")),
            "role_designation": clean_str(emp.get("Designation")),
            "department": clean_str(emp.get("Department")),
            "employee_type": clean_str(emp.get("Employee_type")),
            "total_experience": exp,
            "photo_url": clean_str(emp.get("Photo_downloadUrl")),
        }

        pro_data = {
            "employee_id": emp_id,
            "reporting_manager_id": extract_manager_id(emp.get("Reporting_To")),
            "employee_status": clean_str(emp.get("Employeestatus")) or "Active"
        }

        try:
            cur.execute("SAVEPOINT sp")
            cur.execute(master_query, master_data)
            cur.execute("RELEASE SAVEPOINT sp")
            processed += 1
        except Exception as e:
            print(f"Error upserting master record for {emp_id}: {e}")
            cur.execute("ROLLBACK TO SAVEPOINT sp")
            errors += 1
            continue

        # For employee_master_pro, wait until all employees are inserted? 
        # Actually reporting_manager_id relies on FK to employee_master. 
        # If the manager isn't inserted yet, FK violation will happen.
        # So we should insert the PRO data in a second pass, or disable/defer the FK constraint.
        # But wait, our pipeline skill says: "After bulk upsert, always resolve manager IDs". 
        # We can insert PRO data with reporting_manager_id initially, BUT wait, 
        # if the manager isn't in employee_master yet, it will fail the FK:
        # employee_master_pro_reporting_manager_id_fkey FOREIGN KEY (reporting_manager_id) REFERENCES public.employee_master(employee_id)
        # So it's better to store pro_data in a list and do a second pass after ALL master records are upserted!

    conn.commit()

    print("Pass 1 complete. Starting Pass 2 for employee_master_pro...")

    # Pass 2: Upsert employee_master_pro
    for emp in raw_employees:
        emp_id = clean_str(emp.get("EmployeeID"))
        if not emp_id or not clean_str(emp.get("EmailID")):
            continue

        manager_id = extract_manager_id(emp.get("Reporting_To"))
        
        # We need to verify if the manager_id actually exists in employee_master
        # to avoid FK violation.
        valid_manager_id = None
        if manager_id:
            cur.execute("SELECT 1 FROM employee_master WHERE employee_id = %s", (manager_id,))
            if cur.fetchone():
                valid_manager_id = manager_id

        pro_data = {
            "employee_id": emp_id,
            "reporting_manager_id": valid_manager_id,
            "employee_status": clean_str(emp.get("Employeestatus")) or "Active"
        }

        try:
            cur.execute("SAVEPOINT sp")
            cur.execute(pro_query, pro_data)
            cur.execute("RELEASE SAVEPOINT sp")
        except Exception as e:
            print(f"Error upserting pro record for {emp_id}: {e}")
            cur.execute("ROLLBACK TO SAVEPOINT sp")
            continue
            
    conn.commit()

    # --- Recycle Bin Purge: Delete employees soft-deleted > 30 days ago ---
    try:
        cur.execute("""
            SELECT employee_id FROM employee_master 
            WHERE is_deleted = TRUE 
              AND updated_at < CURRENT_DATE - INTERVAL '30 days'
        """)
        expired_ids = [row[0] for row in cur.fetchall()]
        if expired_ids:
            print(f"Purging {len(expired_ids)} soft-deleted employees older than 30 days from database...")
            cur.execute("UPDATE employee_master_pro SET reporting_manager_id = NULL WHERE reporting_manager_id = ANY(%s)", (expired_ids,))
            cur.execute("DELETE FROM employee_certificates WHERE employee_id = ANY(%s)", (expired_ids,))
            cur.execute("DELETE FROM employee_skills WHERE employee_id = ANY(%s)", (expired_ids,))
            cur.execute("DELETE FROM weekly_allocations WHERE allocation_id IN (SELECT allocation_id FROM projects_allocation WHERE employee_id = ANY(%s))", (expired_ids,))
            cur.execute("DELETE FROM projects_allocation WHERE employee_id = ANY(%s)", (expired_ids,))
            cur.execute("DELETE FROM users WHERE employee_id = ANY(%s)", (expired_ids,))
            cur.execute("DELETE FROM employee_master_pro WHERE employee_id = ANY(%s)", (expired_ids,))
            cur.execute("DELETE FROM employee_master WHERE employee_id = ANY(%s)", (expired_ids,))
            conn.commit()
            print("Purge complete.")
    except Exception as pe:
        print(f"Failed to run automated 30-day recycle bin purge: {pe}")
        conn.rollback()

    # Post-sync cleanup check for Victoria Jenifer D. Jayaraj
    if not victoria_already_in_db:
        try:
            cur.execute("SELECT employee_id FROM public.employee_master WHERE LOWER(employee_name) LIKE %s OR LOWER(email_id) = %s OR employee_id = %s",
                        ('%victoria jenifer%', 'jenniferv@clouddestinations.com', 'CD-CJB01-00067'))
            victoria_row = cur.fetchone()
            if victoria_row:
                victoria_id = victoria_row[0]
                print(f"Victoria Jenifer D. Jayaraj was created by sync. Deleting her record (ID: {victoria_id}) as requested...")
                cur.execute("UPDATE public.employee_master_pro SET reporting_manager_id = NULL WHERE reporting_manager_id = %s", (victoria_id,))
                cur.execute("DELETE FROM public.employee_certificates WHERE employee_id = %s", (victoria_id,))
                cur.execute("DELETE FROM public.employee_skills WHERE employee_id = %s", (victoria_id,))
                cur.execute("DELETE FROM public.weekly_allocations WHERE allocation_id IN (SELECT allocation_id FROM public.projects_allocation WHERE employee_id = %s)", (victoria_id,))
                cur.execute("DELETE FROM public.projects_allocation WHERE employee_id = %s", (victoria_id,))
                cur.execute("DELETE FROM public.users WHERE employee_id = %s", (victoria_id,))
                cur.execute("DELETE FROM public.employee_master_pro WHERE employee_id = %s", (victoria_id,))
                cur.execute("DELETE FROM public.employee_master WHERE employee_id = %s", (victoria_id,))
                conn.commit()
                print("Victoria Jenifer D. Jayaraj deleted successfully.")
        except Exception as ve:
            print(f"Failed to check/delete Victoria Jenifer D. Jayaraj: {ve}")
            conn.rollback()

    cur.close()
    conn.close()

    print(f"Sync complete. Processed {processed} records successfully. Errors: {errors}")

if __name__ == "__main__":
    sync_employees()
