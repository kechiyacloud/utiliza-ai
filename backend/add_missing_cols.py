import os, sys
sys.path.append(os.getcwd())
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    conn.autocommit = True
    cur = conn.cursor()
    cols = [
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
    for col in cols:
        try:
            cur.execute(f"ALTER TABLE projects ADD COLUMN {col}")
            print(f"Added column {col}")
        except Exception as e:
            print(f"Skipping {col} - {e}")
            pass
except Exception as e:
    print(e)
