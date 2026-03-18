import os, sys
sys.path.append(os.getcwd())
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT project_id, project_name, objective, deliverables, start_date, end_date FROM projects LIMIT 5;")
    res = cur.fetchall()
    print("Projects:", res)
    cur.execute("SELECT * FROM projects_allocation LIMIT 5;")
    alloc = cur.fetchall()
    print("Allocations:", alloc)
except Exception as e:
    import traceback
    traceback.print_exc()
