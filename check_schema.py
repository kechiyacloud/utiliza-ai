import psycopg2
import os
host = os.environ.get('DB_HOST', '127.0.0.1')
conn = psycopg2.connect(host=host, port=5432, user='admin', password='admin', database='cdutiliza')
cur = conn.cursor()

print("--- Tables ---")
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
tables = [r[0] for r in cur.fetchall()]
print(tables)

for t in ["employee_masters_pro", "employee_master_pro"]:
    if t in tables:
        print(f"\n--- {t} ---")
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{t}';")
        cols = [r[0] for r in cur.fetchall()]
        print(cols)

cur.close()
conn.close()
