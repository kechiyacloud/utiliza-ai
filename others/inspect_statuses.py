import sys
import os
sys.path.append(r'c:\Users\IjaazAhamed\Desktop\manman\cd-utiliza-ai\backend')
from app.database import db_cursor

with db_cursor() as cur:
    cur.execute("""
        SELECT p.employee_status, COUNT(*) 
        FROM employee_master_pro p
        JOIN employee_master em ON p.employee_id = em.employee_id
        WHERE (em.is_deleted IS FALSE OR em.is_deleted IS NULL)
          AND (em.date_of_resign IS NULL OR em.date_of_resign > CURRENT_DATE)
          AND NOT EXISTS (
              SELECT 1 FROM employee_master_pro p_sub 
              WHERE p_sub.employee_id = em.employee_id 
                AND (p_sub.employee_status ILIKE '%%resign%%' OR p_sub.employee_status ILIKE '%%terminate%%')
          )
        GROUP BY p.employee_status
    """)
    rows = cur.fetchall()
    print("Employee Status | Count")
    print("-" * 30)
    for r in rows:
        print(f"{r[0]} | {r[1]}")
