"""
migrate_crud.py
---------------
Idempotent migration to ensure all tables/columns required for the
dashboard CRUD features exist.  Safe to run multiple times.

Run from the backend directory:
    python migrate_crud.py
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_conn():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


DDL_STATEMENTS = [
    # ── project_commercials ────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS project_commercials (
        id              SERIAL PRIMARY KEY,
        project_id      VARCHAR(255) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        project_name    VARCHAR(255),
        client_id       INT,
        budget          VARCHAR(255),
        billing_type    VARCHAR(255),
        contract_type   VARCHAR(255),
        revenue_model   VARCHAR(255),
        commercial_notes TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,

    # ── project_scopes ─────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS project_scopes (
        id             SERIAL PRIMARY KEY,
        project_id     VARCHAR(255) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        objective      TEXT,
        deliverables   TEXT,
        milestones     TEXT,
        timeline_notes TEXT,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,

    # ── actionable_todos ───────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS actionable_todos (
        id         SERIAL PRIMARY KEY,
        message    TEXT,
        type       VARCHAR(255),
        status     VARCHAR(255) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,

    # ── weekly_allocations ─────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS weekly_allocations (
        id               SERIAL PRIMARY KEY,
        allocation_id    VARCHAR(255) REFERENCES projects_allocation(allocation_id) ON DELETE CASCADE,
        allocation_year  INT,
        week_number      INT,
        allocated_hours  NUMERIC DEFAULT 0
    )
    """,

    # ── projects_allocation: add missing columns if absent ────────────────────
    """
    ALTER TABLE projects_allocation
        ADD COLUMN IF NOT EXISTS allocation_start_date DATE
    """,
    """
    ALTER TABLE projects_allocation
        ADD COLUMN IF NOT EXISTS allocation_end_date DATE
    """,

    # ── projects: ensure project_type column exists ───────────────────────────
    """
    ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS project_type VARCHAR(255)
    """,

    # ── projects: ensure client_id + client_name columns exist ───────────────
    """
    ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS client_id INT
    """,
    """
    ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)
    """,

    # ── clients table (referenced by projects) ────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS clients (
        client_id   SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
]


def run_migration():
    print("Connecting to database ...")
    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        for stmt in DDL_STATEMENTS:
            label = stmt.strip().split("\n")[0][:80]
            print(f"  Running: {label} ...")
            cur.execute(stmt)

        conn.commit()
        print("\n[OK] Migration complete! All tables and columns are up to date.")
    except Exception as exc:
        conn.rollback()
        print(f"\n[FAIL] Migration failed: {exc}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
