import sys
import os
import psycopg2
from datetime import datetime

# Explicitly add the current directory to sys.path so we can import app.database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db_connection

def clear_mock_data():
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE projects 
            SET
                objective = NULL,
                deliverables = NULL,
                milestones = NULL,
                timeline_notes = NULL,
                budget = NULL,
                billing_type = NULL,
                contract_type = NULL,
                revenue_model = NULL,
                commercial_notes = NULL
            WHERE project_id IN (
                'CDIN001', 'CP001', 'CP002', 'CP003', 'CP004', 'CP005', 'CP006', 'CP007', 'CP008',
                'CP009', 'CP010', 'CP011', 'CP012', 'CP013', 'CP014', 'CP015', 'CP016'
            )
        """)
        
        conn.commit()
        print(f"Successfully cleared mock detailed data for original projects!")
    except Exception as e:
        conn.rollback()
        print(f"Error clearing data: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    clear_mock_data()
