import sys
import os
sys.path.append(os.getcwd())
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';")
    print([r[0] for r in cur.fetchall()])
except Exception as e:
    import traceback
    traceback.print_exc()
