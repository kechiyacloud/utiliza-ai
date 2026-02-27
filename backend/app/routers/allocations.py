from fastapi import APIRouter, HTTPException
from app.database import get_db_connection

router = APIRouter(prefix="/allocations", tags=["Allocations"])


@router.get("/metrics")
def allocation_metrics():
    """
    Returns all 6 info-card metrics for the Allocation page:
    Total Resources, Billable, Non-Billable, Bench Strength,
    Avg Utilization, and Overallocated count.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Total Resources — all employees
        cur.execute("SELECT COUNT(*) FROM employee_master")
        total_resources = cur.fetchone()[0]

        # 2. Billable Count — distinct employees tagged 'Allocated - Billable'
        cur.execute("""
            SELECT COUNT(DISTINCT employee_id)
            FROM projects_allocation
            WHERE LOWER(project_tags) = 'billable'
        """)
        billable_count = cur.fetchone()[0]

        # 3. Non-Billable Count — distinct employees tagged 'Allocated - NonBillable'
        cur.execute("""
            SELECT COUNT(DISTINCT employee_id)
            FROM projects_allocation
            WHERE LOWER(project_tags) = 'nonbillable'
        """)
        non_billable_count = cur.fetchone()[0]

        # 4. Bench Strength
        cur.execute("""
            SELECT COUNT(*)
            FROM employee_master_pro
            WHERE employee_status = 'Bench'
        """)
        bench_strength = cur.fetchone()[0]

        # 5. Avg Utilization 
        cur.execute("""
            SELECT COALESCE(AVG(allocation_percentage), 0)
            FROM projects_allocation
        """)
        avg_utilization = round(float(cur.fetchone()[0]), 2)

        # 6. Overallocated — employees in multiple projects, all billable
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT employee_id
                FROM projects_allocation
                WHERE LOWER(project_tags) = 'billable'
                GROUP BY employee_id
                HAVING COUNT(DISTINCT project_id) > 1
                   AND COUNT(*) = COUNT(CASE WHEN LOWER(project_tags) = 'billable' THEN 1 END)
            ) overalloc
        """)
        overallocated = cur.fetchone()[0]

        return {
            "totalResources": {"value": total_resources, "label": "Total Resources"},
            "billable":       {"value": billable_count,   "label": "Billable Count"},
            "nonBillable":    {"value": non_billable_count, "label": "Non-Billable"},
            "benchStrength":  {"value": bench_strength,   "label": "Bench Strength"},
            "avgUtilization": {"value": f"{avg_utilization}%", "label": "Avg Utilization"},
            "overallocated":  {"value": overallocated,    "label": "Overallocated", "isAlert": overallocated > 0}
        }

    except Exception as e:
        print("Allocation metrics DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.get("/projects")
def allocation_projects():
    """
    Returns all projects with their billable and non-billable employee counts.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                pa.project_id,
                p.project_name,
                COUNT(DISTINCT CASE WHEN LOWER(pa.project_tags) = 'billable' THEN pa.employee_id END) AS billable_count,
                COUNT(DISTINCT CASE WHEN LOWER(pa.project_tags) = 'nonbillable' THEN pa.employee_id END) AS non_billable_count
            FROM projects_allocation pa
            JOIN projects p ON pa.project_id = p.project_id
            GROUP BY pa.project_id, p.project_name
            ORDER BY p.project_name
        """)

        rows = cur.fetchall()

        return [
            {
                "project_id": r[0],
                "project_name": r[1],
                "billable_count": r[2],
                "non_billable_count": r[3]
            }
            for r in rows
        ]

    except Exception as e:
        print("Allocation projects DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.get("/projects/{project_id}/employees")
def project_employees(project_id: str):
    """
    Returns employees allocated to a specific project with allocation % and tag.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                pa.employee_id,
                em.employee_name,
                (pa.allocation_percentage) AS allocation_pct,
                pa.project_tags
            FROM projects_allocation pa
            JOIN employee_master em ON pa.employee_id = em.employee_id
            WHERE pa.project_id = %s
            ORDER BY em.employee_name
        """, (project_id,))

        rows = cur.fetchall()

        return [
            {
                "employee_id": r[0],
                "employee_name": r[1],
                "allocation_percentage": int(r[2]),
                "project_tags": r[3]
            }
            for r in rows
        ]

    except Exception as e:
        print("Project employees DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.get("/organization")
def organization_utilization():
    """
    Returns organization-wide utilization and breakdown.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Avg Utilization
        cur.execute("SELECT COALESCE(AVG(allocation_percentage), 0) FROM projects_allocation")
        avg_util = float(cur.fetchone()[0])

        # 2. Breakdown by employee status
        cur.execute("""
            SELECT employee_status, COUNT(*) 
            FROM employee_master_pro 
            GROUP BY employee_status
        """)
        rows = cur.fetchall()
        
        # Mapping statuses to colors (matching OrganizationUtilization.jsx)
        color_map = {
            "Bench": "#94a3b8",
            "Billable": "#60a5fa",
            "Internal": "#c084fc",
            "Training": "#34d399"
        }
        
        breakdown = []
        for status, count in rows:
            if status: # Avoid empty status
                breakdown.append({
                    "label": status,
                    "value": count,
                    "color": color_map.get(status, "#cbd5e1") # default gray-300
                })

        return {
            "used": avg_util,
            "breakdown": breakdown
        }

    except Exception as e:
        print("Organization utilization DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/department-breakdown")
def department_allocation_breakdown():
    """
    Returns billable and non-billable employee counts per department with 3 categories:
    1. Allocated and Billable (Green)
    2. Allocated and Non-Billable (Blue)
    3. Not Allocated and Billable (Orange)
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Hierarchy:
        # 1: Allocated & Billable (>0% and 'billable' not 'non')
        # 2: Allocated & Non-Billable (>0% and 'nonbillable')
        # 3: Not Allocated & Billable (0% and 'billable' not 'non')
        cur.execute("""
            WITH EmpStatus AS (
                SELECT 
                    em.employee_id,
                    em.department,
                    CASE 
                        WHEN (pa.allocation_percentage > 0 AND LOWER(pa.project_tags) LIKE '%billable%' AND LOWER(pa.project_tags) NOT LIKE '%non%') THEN 1
                        WHEN (pa.allocation_percentage > 0 AND LOWER(pa.project_tags) LIKE '%nonbillable%') THEN 2
                        WHEN (pa.allocation_percentage = 0 AND LOWER(pa.project_tags) LIKE '%billable%' AND LOWER(pa.project_tags) NOT LIKE '%non%') THEN 3
                        ELSE 4
                    END as status_rank
                FROM employee_master em
                JOIN projects_allocation pa ON em.employee_id = pa.employee_id
            ),
            BestStatus AS (
                SELECT 
                    employee_id,
                    department,
                    MIN(status_rank) as top_rank
                FROM EmpStatus
                GROUP BY employee_id, department
            )
            SELECT 
                department,
                COUNT(CASE WHEN top_rank = 1 THEN 1 END) as allocated_billable,
                COUNT(CASE WHEN top_rank = 2 THEN 1 END) as allocated_non_billable,
                COUNT(CASE WHEN top_rank = 3 THEN 1 END) as not_allocated_billable
            FROM BestStatus
            GROUP BY department
            ORDER BY department
        """)

        rows = cur.fetchall()

        return [
            {
                "department": r[0] if r[0] else "Unknown",
                "allocated_billable": r[1],
                "allocated_non_billable": r[2],
                "not_allocated_billable": r[3]
            }
            for r in rows
        ]

    except Exception as e:
        print("Department breakdown DB error:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


