import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("Running schema updates...")

    # Create clients
    cur.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    """)
    print("Clients table created.")

    # Create partners 
    cur.execute("""
        CREATE TABLE IF NOT EXISTS partners (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL
        )
    """)
    print("Partners table created.")

    # Create team_members for detailed tracking
    cur.execute("""
        CREATE TABLE IF NOT EXISTS team_members (
            id SERIAL PRIMARY KEY,
            project_id VARCHAR(255) REFERENCES projects(project_id) ON DELETE CASCADE,
            name VARCHAR(255),
            role VARCHAR(255),
            company VARCHAR(255),
            company_type VARCHAR(50),
            location VARCHAR(150),
            w1 INT DEFAULT 0,
            w2 INT DEFAULT 0,
            w3 INT DEFAULT 0,
            w4 INT DEFAULT 0
        )
    """)
    print("Team Members table created.")

    # Alter projects safely
    try:
        cur.execute("ALTER TABLE projects ADD COLUMN client_id INT REFERENCES clients(id)")
    except Exception as e:
        print(f"Skipping client_id (already exists?): {e}")

    try:
        cur.execute("ALTER TABLE projects ADD COLUMN partner_id INT REFERENCES partners(id)")
    except Exception as e:
        print(f"Skipping partner_id (already exists?): {e}")

    try:
        cur.execute("ALTER TABLE projects ADD COLUMN project_type VARCHAR(100)")
    except Exception as e:
        print(f"Skipping project_type (already exists?): {e}")

    print("Schema updates complete!")

except Exception as e:
    print(f"Fatal Error: {e}")
