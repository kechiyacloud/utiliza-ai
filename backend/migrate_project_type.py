import psycopg2
from app.database import get_db_connection

def migrate():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Update projects table
        cur.execute("UPDATE projects SET project_type = 'External' WHERE LOWER(project_type) = 'client';")
        count = cur.rowcount
        conn.commit()
        print(f"Successfully updated {count} projects from 'Client' to 'External'.")
        
        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
