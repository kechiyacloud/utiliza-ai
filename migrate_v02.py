import psycopg2
import os

# Read DB creds from environment (same as backend container uses)
DB_HOST = os.environ.get("DB_HOST", "db")
DB_USER = os.environ.get("DB_USER", "admin")
DB_PASS = os.environ.get("DB_PASSWORD", "admin")
DB_NAME = os.environ.get("DB_NAME", "cdutiliza")

print(f"Connecting to {DB_HOST}/{DB_NAME} as {DB_USER}")

conn = psycopg2.connect(host=DB_HOST, port=5432, user=DB_USER, password=DB_PASS, database=DB_NAME)
cur = conn.cursor()

# Check columns that exist on projects table
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='projects' ORDER BY ordinal_position;")
cols = [r[0] for r in cur.fetchall()]
print("Existing project columns:", cols)

# Apply missing columns
ddl = {
    "project_type": "ALTER TABLE projects ADD COLUMN project_type VARCHAR(50) DEFAULT 'Client';",
    "client_id": "ALTER TABLE projects ADD COLUMN client_id VARCHAR(50);",
    "partner_id": "ALTER TABLE projects ADD COLUMN partner_id VARCHAR(50);",
    "budget": "ALTER TABLE projects ADD COLUMN budget NUMERIC(15,2);",
    "billing_type": "ALTER TABLE projects ADD COLUMN billing_type VARCHAR(100);",
    "contract_type": "ALTER TABLE projects ADD COLUMN contract_type VARCHAR(100);",
    "revenue_model": "ALTER TABLE projects ADD COLUMN revenue_model VARCHAR(100);",
    "commercial_notes": "ALTER TABLE projects ADD COLUMN commercial_notes TEXT;",
    "objective": "ALTER TABLE projects ADD COLUMN objective TEXT;",
    "deliverables": "ALTER TABLE projects ADD COLUMN deliverables TEXT;",
    "milestones": "ALTER TABLE projects ADD COLUMN milestones TEXT;",
    "timeline_notes": "ALTER TABLE projects ADD COLUMN timeline_notes TEXT;",
}

for col, sql in ddl.items():
    if col not in cols:
        print(f"Adding column: {col}")
        cur.execute(sql)

# Ensure new tables exist
cur.execute("""
CREATE TABLE IF NOT EXISTS clients (
    client_id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(255) UNIQUE NOT NULL,
    website_url VARCHAR(255),
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Stable',
    budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS partners (
    partner_id VARCHAR(50) PRIMARY KEY,
    partner_name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS project_commercials (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    project_name VARCHAR(255),
    client_id VARCHAR(50),
    budget NUMERIC(15, 2) DEFAULT 0.00,
    billing_type VARCHAR(100),
    contract_type VARCHAR(100),
    revenue_model VARCHAR(100),
    commercial_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS project_scopes (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
    objective TEXT,
    deliverables TEXT,
    milestones TEXT,
    timeline_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS weekly_allocations (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(50) REFERENCES projects_allocation(allocation_id) ON DELETE CASCADE,
    allocation_year INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    allocated_hours INTEGER DEFAULT 0,
    UNIQUE(allocation_id, allocation_year, week_number)
);
""")

conn.commit()
cur.close()
conn.close()
print("Migration complete!")
