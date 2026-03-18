import os, sys
sys.path.append(os.getcwd())
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects';")
    print(cur.fetchall())
except Exception as e:
    import traceback
    traceback.print_exc()
