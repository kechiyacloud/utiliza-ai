from app.database import get_db_connection

def run_performance_and_sync_migration():
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        print("Starting database migration...")
        
        # 1. Add Performance Indexes
        print("Adding indexes to projects_allocation...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_pa_employee_id ON projects_allocation (employee_id);
            CREATE INDEX IF NOT EXISTS idx_pa_project_id ON projects_allocation (project_id);
            CREATE INDEX IF NOT EXISTS idx_pa_dates ON projects_allocation (allocation_start_date, allocation_end_date);
        """)
        
        print("Adding indexes to employee_master and employee_master_pro...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_em_department ON employee_master (department);
            CREATE INDEX IF NOT EXISTS idx_em_resign ON employee_master (date_of_resign);
            CREATE INDEX IF NOT EXISTS idx_emp_pro_status ON employee_master_pro (employee_status);
        """)
        
        # 2. Create the Trigger Function
        print("Creating allocation sync trigger function...")
        cur.execute("""
            CREATE OR REPLACE FUNCTION sync_employee_allocations()
            RETURNS TRIGGER AS $$
            DECLARE
                target_emp_id VARCHAR;
            BEGIN
                -- Determine the employee_id based on the operation
                IF TG_OP = 'DELETE' THEN
                    target_emp_id := OLD.employee_id;
                ELSE
                    target_emp_id := NEW.employee_id;
                END IF;

                -- Update the employee_allocations in employee_master_pro
                -- We only sum active allocations (end_date IS NULL OR >= CURRENT_DATE)
                UPDATE employee_master_pro
                SET employee_allocations = (
                    SELECT COALESCE(SUM(allocation_percentage), 0)
                    FROM projects_allocation
                    WHERE employee_id = target_emp_id
                    AND (allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE)
                )
                WHERE employee_id = target_emp_id;

                RETURN NULL; -- Return NULL for AFTER triggers
            END;
            $$ LANGUAGE plpgsql;
        """)
        
        # 3. Attach the Trigger
        print("Attaching trigger to projects_allocation table...")
        cur.execute("DROP TRIGGER IF EXISTS trg_sync_allocations ON projects_allocation;")
        cur.execute("""
            CREATE TRIGGER trg_sync_allocations
            AFTER INSERT OR UPDATE OR DELETE ON projects_allocation
            FOR EACH ROW
            EXECUTE FUNCTION sync_employee_allocations();
        """)
        
        # 4. Run an initial manual sync to fix any existing mismatches
        print("Running initial sync for all employees...")
        cur.execute("""
            UPDATE employee_master_pro emp
            SET employee_allocations = (
                SELECT COALESCE(SUM(pa.allocation_percentage), 0)
                FROM projects_allocation pa
                WHERE pa.employee_id = emp.employee_id
                AND (pa.allocation_end_date IS NULL OR pa.allocation_end_date >= CURRENT_DATE)
            );
        """)
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_performance_and_sync_migration()
