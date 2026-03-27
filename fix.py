import os

with open('backend/app/routers/employees.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = lines[:833]

with open('backend/app/routers/employees.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    f.write('''
@router.get('/employees/allocations/weekly')
def get_all_employee_weekly_allocations():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT pa.employee_id, wa.allocation_year, wa.week_number, SUM(wa.allocated_hours)
            FROM weekly_allocations wa
            JOIN projects_allocation pa ON wa.allocation_id = pa.allocation_id
            WHERE wa.allocation_year IS NOT NULL AND wa.week_number IS NOT NULL
            GROUP BY pa.employee_id, wa.allocation_year, wa.week_number
        """)
        rows = cur.fetchall()
        
        result = {}
        for row in rows:
            emp_id, year, week, hours = row
            if emp_id not in result:
                result[emp_id] = {}
            result[emp_id][f"{year}-{week}"] = float(hours)
            
        return result
    except Exception as e:
        print(f"Error fetching weekly allocations: {e}")
        return {}
    finally:
        cur.close()
        release_db_connection(conn)
''')
