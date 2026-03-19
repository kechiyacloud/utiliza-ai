import sys
sys.path.insert(0, '/app')

import os

# Check bcrypt and passlib versions
print("--- Package versions ---")
os.system("pip show bcrypt passlib 2>&1 | grep -E 'Name|Version'")

# Check users table
print("\n--- Users table ---")
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    # List all tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
    tables = [r[0] for r in cur.fetchall()]
    print("Tables:", tables)
    
    if 'users' in tables:
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users';")
        cols = [r[0] for r in cur.fetchall()]
        print("Users columns:", cols)
        
        cur.execute("SELECT id, email, password_hash FROM users LIMIT 5;")
        rows = cur.fetchall()
        print("Users rows:", rows[:2])
    else:
        print("ERROR: 'users' table does NOT exist!")
        # Try to create it
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        print("Created users table!")
    
    cur.close()
    conn.close()
except Exception as e:
    print("ERROR:", e)

# Test passlib hash
print("\n--- Passlib test ---")
try:
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    h = ctx.hash("testpass")
    v = ctx.verify("testpass", h)
    print("Passlib hash/verify OK:", v)
except Exception as e:
    print("PASSLIB ERROR:", repr(e))
