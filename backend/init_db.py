import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def init_db():
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

        print("Initializing base schema...")

        # Order matters for foreign keys
        
        # 1. Base tables with no FKs
        tables = [
            """
            CREATE TABLE IF NOT EXISTS projects (
                project_id VARCHAR(255) PRIMARY KEY,
                project_name VARCHAR(255),
                project_status VARCHAR(255),
                billable VARCHAR(255),
                start_date DATE,
                end_date DATE,
                project_type VARCHAR(255)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS skills (
                skill_id SERIAL PRIMARY KEY,
                skill_name VARCHAR(255)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                password_hash VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                failed_login_attempts INT DEFAULT 0,
                last_login_at TIMESTAMP,
                password_changed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS certificates (
                certificate_id VARCHAR(255) PRIMARY KEY,
                certificate_name VARCHAR(255)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS employee_master (
                si_number SERIAL,
                employee_id VARCHAR(255) PRIMARY KEY,
                employee_name VARCHAR(255),
                phone_number BIGINT,
                email_id VARCHAR(255),
                location VARCHAR(255),
                mode_of_work VARCHAR(255),
                date_of_joining DATE,
                role_designation VARCHAR(255),
                department VARCHAR(255),
                employee_type VARCHAR(255),
                total_experience NUMERIC,
                experience_in_cd NUMERIC,
                shift VARCHAR(255),
                time_zone VARCHAR(255),
                date_of_resign DATE,
                photo_url VARCHAR(255)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS actionable_todos (
                id SERIAL PRIMARY KEY,
                message TEXT,
                type VARCHAR(255),
                status VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        ]

        for table_sql in tables:
            cur.execute(table_sql)

        # 2. Tables with FKs
        fk_tables = [
            """
            CREATE TABLE IF NOT EXISTS employee_certificates (
                certificate_id VARCHAR(255) REFERENCES certificates(certificate_id),
                employee_id VARCHAR(255) REFERENCES employee_master(employee_id),
                PRIMARY KEY (certificate_id, employee_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS employee_master_pro (
                employee_id VARCHAR(255) PRIMARY KEY REFERENCES employee_master(employee_id),
                reporting_manager_id VARCHAR(255),
                employee_status VARCHAR(255),
                upcoming_leaves VARCHAR(255),
                employee_allocations INT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS employee_skills (
                employee_id VARCHAR(255) REFERENCES employee_master(employee_id),
                skill_id INT REFERENCES skills(skill_id),
                proficiency_level INT,
                years_of_experience NUMERIC,
                PRIMARY KEY (employee_id, skill_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS project_skills (
                project_id VARCHAR(255) REFERENCES projects(project_id),
                skill_id INT REFERENCES skills(skill_id),
                PRIMARY KEY (project_id, skill_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS projects_allocation (
                allocation_id VARCHAR(255) PRIMARY KEY,
                employee_id VARCHAR(255) REFERENCES employee_master(employee_id),
                project_id VARCHAR(255) REFERENCES projects(project_id),
                role_in_project VARCHAR(255),
                allocation_percentage INT,
                allocation_start_date DATE,
                allocation_end_date DATE,
                project_tags VARCHAR(255)
            )
            """
        ]

        for table_sql in fk_tables:
            cur.execute(table_sql)

        print("Base schema initialization complete!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error initializing DB: {e}")

if __name__ == "__main__":
    init_db()
