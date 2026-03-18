import sys
import os
import psycopg2
from datetime import datetime

# Explicitly add the current directory to sys.path so we can import app.database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db_connection

original_data = [
    ["CDIN001", "Project Dashboard", "Live", "Non - Billable", "1/14/2026", "3/13/2026"],
    ["CP001", "Aaon - Flexpoint", "Ended", "Billable", "12/31/2025", "2/25/2026"],
    ["CP002", "DevOps Support Onyx", "Live", "Billable", "1/1/2026", None],
    ["CP003", "Josys Infra Provisioning and Management", "Live", "Billable", "7/19/2023", "12/31/2026"],
    ["CP004", "OpsNow SRE Project", "Ended", "Billable", "1/3/2026", "2/25/2026"],
    ["CP005", "Managed Services - Paradigm", "Live", "Billable", "1/4/2026", None],
    ["CP006", "CloudOps Support", "Live", "Billable", "1/5/2026", None],
    ["CP007", "AlertNow Maintenance Project", "Ended", "Billable", "1/6/2026", "2/25/2026"],
    ["CP008", "GCP - Infrastruture Support", "Live", "Billable", "1/7/2026", None],
    ["CP009", "Inertia Cloud Operartions", "Live", "Billable", "1/8/2026", None],
    ["CP010", "Bespin POD", "Live", "Billable", "1/9/2026", None],
    ["CP011", "Platform Engineering Project - Forge", "Live", "Billable", "11/14/2024", "7/31/2026"],
    ["CP012", "Optum: TnM", "Live", "Billable", "1/11/2026", None],
    ["CP013", "MHC - Power BI Enablement", "Ended", "Billable", "1/12/2026", "2/25/2026"],
    ["CP014", "MHC - Enterprise Data Warehouse", "Ended", "Billable", "1/13/2026", "2/27/2026"],
    ["CP015", "Movius - Onprem to Cloud Migration", "Live", "Billable", "10/3/2025", None],
    ["CP016", "Chicago Public Sc", "Live", "Billable", "1/1/2026", None]
]

def parse_date(date_str):
    if not date_str:
        return None
    try:
        # e.g., 1/14/2026 or 25/02/2026
        parts = date_str.split('/')
        if len(parts) == 3:
            # try m/d/yyyy
            try:
                return datetime.strptime(date_str, "%m/%d/%Y").date()
            except ValueError:
                # try d/m/yyyy 
                return datetime.strptime(date_str, "%d/%m/%Y").date()
        return None
    except Exception:
        return None

def restore_data():
    conn = get_db_connection()
    cur = conn.cursor()
    
    upserted_count = 0
    try:
        for row in original_data:
            pid = row[0]
            pname = row[1]
            status = row[2]
            billable = row[3]
            s_date = parse_date(row[4])
            e_date = parse_date(row[5])
            
            project_type = "Internal" if "Non" in billable else "Client"
            
            cur.execute("SELECT project_id FROM projects WHERE project_id = %s", (pid,))
            exists = cur.fetchone()
            
            if exists:
                cur.execute("""
                    UPDATE projects 
                    SET project_name = %s, project_status = %s, billable = %s, start_date = %s, end_date = %s, project_type = %s
                    WHERE project_id = %s
                """, (pname, status, billable, s_date, e_date, project_type, pid))
            else:
                cur.execute("""
                    INSERT INTO projects (project_id, project_name, project_status, billable, start_date, end_date, project_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (pid, pname, status, billable, s_date, e_date, project_type))
                
            upserted_count += 1
            
        conn.commit()
        print(f"Successfully restored/updated {upserted_count} original projects!")
    except Exception as e:
        conn.rollback()
        print(f"Error restoring data: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    restore_data()
