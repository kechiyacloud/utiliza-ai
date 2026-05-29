import sys, os
from dotenv import load_dotenv
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)
load_dotenv(os.path.join(backend_dir, '.env'))
from app.database import get_db_connection, release_db_connection

# One-shot backfill: rows with total_experience > 80 are almost certainly stored
# in months (Zoho's native unit) rather than years. Convert them to years.
# Idempotent: re-running skips rows already <= 80.

conn = get_db_connection()
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM employee_master WHERE total_experience > 80;")
to_fix = cur.fetchone()[0]
print(f"Rows to convert (months -> years): {to_fix}")

if to_fix:
    cur.execute("""
        UPDATE employee_master
        SET total_experience = ROUND((total_experience / 12.0)::numeric, 2)
        WHERE total_experience > 80;
    """)
    conn.commit()
    print(f"Updated {cur.rowcount} rows.")
else:
    print("Nothing to do.")

cur.close()
release_db_connection(conn)
