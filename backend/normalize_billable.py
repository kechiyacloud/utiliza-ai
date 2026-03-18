import sys
import os
import psycopg2

# Path to backend directory
backend_path = os.path.join(os.getcwd(), 'backend')
sys.path.append(backend_path)

try:
    from app.database import get_db_connection
except ImportError:
    # If that fails, try relative import style
    sys.path.append(os.path.join(backend_path, 'app'))
    from database import get_db_connection

def normalize_billable():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Normalize "Non - Billable" to "Non-Billable" and trim whitespace
        cur.execute("""
            UPDATE projects 
            SET billable = 'Non-Billable' 
            WHERE REPLACE(billable, ' ', '') = 'Non-Billable'
        """)
        
        cur.execute("""
            UPDATE projects 
            SET billable = 'Billable' 
            WHERE REPLACE(billable, ' ', '') = 'Billable'
        """)
        
        # Ensure project_type is also consistent
        cur.execute("""
            UPDATE projects 
            SET project_type = 'Internal' 
            WHERE billable = 'Non-Billable'
        """)
        
        cur.execute("""
            UPDATE projects 
            SET project_type = 'Client' 
            WHERE billable = 'Billable' AND project_type = 'Internal'
        """)

        conn.commit()
        print("Successfully normalized billable status in projects table.")
    except Exception as e:
        conn.rollback()
        print(f"Error normalizing data: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    normalize_billable()
