from app.database import get_db_connection


STATUS_SQL = """
UPDATE projects
SET project_status = CASE
    WHEN project_status IS NULL OR btrim(project_status) = '' THEN 'Not Started'
    WHEN lower(replace(btrim(project_status), '_', ' ')) IN ('not started', 'planned', 'upcoming') THEN 'Not Started'
    WHEN lower(replace(btrim(project_status), '_', ' ')) IN ('in progress', 'running', 'live', 'active', 'ongoing') THEN 'In Progress'
    WHEN lower(replace(btrim(project_status), '_', ' ')) IN ('on hold', 'delayed', 'blocked') THEN 'On Hold'
    WHEN lower(replace(btrim(project_status), '_', ' ')) IN ('completed', 'closed', 'done', 'ended', 'end', 'finished') THEN 'Completed'
    ELSE initcap(replace(btrim(project_status), '_', ' '))
END
"""


TYPE_SQL = """
UPDATE projects
SET project_type = CASE
    WHEN project_type IS NULL OR btrim(project_type) = '' THEN
        CASE
            WHEN project_id ILIKE 'CDIN%%' THEN 'Internal'
            WHEN lower(coalesce(billable, '')) LIKE '%%non%%' THEN 'Internal'
            ELSE 'Client'
        END
    WHEN lower(replace(btrim(project_type), '_', ' ')) = 'client' THEN 'Client'
    WHEN lower(replace(btrim(project_type), '_', ' ')) = 'internal' THEN 'Internal'
    WHEN lower(replace(btrim(project_type), '_', ' ')) = 'partner' THEN 'Partner'
    WHEN lower(replace(btrim(project_type), '_', ' ')) = 'poc' THEN 'POC'
    ELSE initcap(replace(btrim(project_type), '_', ' '))
END
"""


def main():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT DISTINCT project_status FROM projects ORDER BY 1")
        print("Before status:", cur.fetchall())
        cur.execute("SELECT DISTINCT project_type FROM projects ORDER BY 1")
        print("Before type:", cur.fetchall())

        cur.execute(STATUS_SQL)
        print("Updated status rows:", cur.rowcount)
        cur.execute(TYPE_SQL)
        print("Updated type rows:", cur.rowcount)

        cur.execute("SELECT DISTINCT project_status FROM projects ORDER BY 1")
        print("After status:", cur.fetchall())
        cur.execute("SELECT DISTINCT project_type FROM projects ORDER BY 1")
        print("After type:", cur.fetchall())

        conn.commit()
        print("Normalization complete.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
