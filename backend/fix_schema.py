import os
import sys

# Ensure we can import app.database
sys.path.append(os.getcwd())

try:
    from app.database import get_db_connection
    conn = get_db_connection()
    conn.autocommit = True
    cur = conn.cursor()

    # --- Projects Table Columns ---
    project_columns = [
        "project_type VARCHAR(255)",
        "client_name VARCHAR(255)",
        "budget VARCHAR(255)",
        "billing_type VARCHAR(255)",
        "contract_type VARCHAR(255)",
        "revenue_model VARCHAR(255)",
        "commercial_notes TEXT",
        "objective TEXT",
        "deliverables TEXT",
        "milestones TEXT",
        "timeline_notes TEXT"
    ]

    print("Migrating 'projects' table...")
    for col_def in project_columns:
        col_name = col_def.split()[0]
        try:
            cur.execute(f"ALTER TABLE projects ADD COLUMN {col_def}")
            print(f"  [+] Added {col_name}")
        except Exception as e:
            if "already exists" in str(e):
                print(f"  [-] {col_name} already exists, skipping.")
            else:
                print(f"  [!] Error adding {col_name}: {e}")

    # --- Projects Allocation Table Columns ---
    allocation_columns = [
        "w1 INTEGER DEFAULT 0",
        "w2 INTEGER DEFAULT 0",
        "w3 INTEGER DEFAULT 0",
        "w4 INTEGER DEFAULT 0",
        "project_tags VARCHAR(255)"
    ]

    print("\nMigrating 'projects_allocation' table...")
    for col_def in allocation_columns:
        col_name = col_def.split()[0]
        try:
            cur.execute(f"ALTER TABLE projects_allocation ADD COLUMN {col_def}")
            print(f"  [+] Added {col_name}")
        except Exception as e:
            if "already exists" in str(e):
                print(f"  [-] {col_name} already exists, skipping.")
            else:
                print(f"  [!] Error adding {col_name}: {e}")

    cur.close()
    conn.close()
    print("\nMigration complete.")

except Exception as e:
    print(f"CRITICAL MIGRATION ERROR: {e}")
    sys.exit(1)
