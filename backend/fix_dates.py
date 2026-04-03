import os
import re

files_to_fix = [
    r'c:\Users\PrasanthSubramanian\Desktop\git-repo-int-project\cd-utiliza-ai\backend\app\routers\employees.py',
    r'c:\Users\PrasanthSubramanian\Desktop\git-repo-int-project\cd-utiliza-ai\backend\app\routers\dashboard.py',
    r'c:\Users\PrasanthSubramanian\Desktop\git-repo-int-project\cd-utiliza-ai\backend\app\routers\allocations.py',
    r'c:\Users\PrasanthSubramanian\Desktop\git-repo-int-project\cd-utiliza-ai\backend\app\routers\projects.py'
]

# The regex matches SELECT SUM(X.allocation_percentage) FROM projects_allocation X WHERE X.employee_id = Y.employee_id (or similar)
# We want to insert the date check right after X.employee_id = Y (or replacing the whole thing)

pattern1 = r'\(SELECT SUM\((pa[0-9]?)\.allocation_percentage\) FROM projects_allocation \1 WHERE \1\.employee_id\s*=\s*([a-zA-Z_0-9.]+?)\)'

def replacer(match):
    alias = match.group(1)
    target = match.group(2)
    return f"(SELECT SUM({alias}.allocation_percentage) FROM projects_allocation {alias} WHERE {alias}.employee_id = {target} AND ({alias}.allocation_end_date IS NULL OR {alias}.allocation_end_date >= CURRENT_DATE))"


for fpath in files_to_fix:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(pattern1, replacer, content)

    # There's also `SUM(pa.allocation_percentage)` inside DynAlloc CTEs in employees.py that don't have the WHERE line horizontally
    # Let's fix that too
    cte_pattern = r'SELECT employee_id, COALESCE\(SUM\(allocation_percentage\), 0\) as total_alloc\s+FROM projects_allocation\s+GROUP BY employee_id'
    cte_replace = "SELECT employee_id, COALESCE(SUM(allocation_percentage), 0) as total_alloc\n                FROM projects_allocation\n                WHERE allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE\n                GROUP BY employee_id"
    
    new_content = re.sub(cte_pattern, cte_replace, new_content)
    
    # And there's fetch_employee_of_month query
    emo_pattern = r'FROM employee_master m\s+LEFT JOIN projects_allocation pa ON m\.employee_id = pa\.employee_id'
    emo_replace = "FROM employee_master m\n            LEFT JOIN projects_allocation pa ON m.employee_id = pa.employee_id AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)"
    
    new_content = re.sub(emo_pattern, emo_replace, new_content)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Fixed {os.path.basename(fpath)}")
