import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check_db():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "workforce_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres")
        )
        cur = conn.cursor()
        
        print("Checking tables...")
        cur.execute("SELECT COUNT(*) FROM employee_certificates")
        print(f"Employee Certificates: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM certificates")
        print(f"Certificates table: {cur.fetchone()[0]}")
        
        cur.execute("SELECT * FROM certificates LIMIT 5")
        print(f"Certificates sample: {cur.fetchall()}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
