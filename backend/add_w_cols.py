import os, sys
sys.path.append(os.getcwd())
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    conn.autocommit = True
    cur = conn.cursor()
    columns_to_add = [
        "w1 INTEGER DEFAULT 0",
        "w2 INTEGER DEFAULT 0",
        "w3 INTEGER DEFAULT 0",
        "w4 INTEGER DEFAULT 0",
    ]
    for col in columns_to_add:
        try:
            cur.execute(f"ALTER TABLE projects_allocation ADD COLUMN {col}")
            print(f"Added {col}")
        except Exception as e:
            print(f"Failed to add {col}: {e}")
except Exception as e:
    import traceback
    traceback.print_exc()
