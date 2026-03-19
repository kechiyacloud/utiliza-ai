import sys
sys.path.insert(0, '/app')

print("--- Testing passlib ---")
try:
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = ctx.hash("testpassword")
    print("Hash OK:", hashed[:20])
    result = ctx.verify("testpassword", hashed)
    print("Verify OK:", result)
except Exception as e:
    print("PASSLIB ERROR:", e)

print("--- Testing DB connection ---")
try:
    from app.database import get_db_connection
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, email FROM users LIMIT 3;")
    rows = cur.fetchall()
    print("Users table OK, rows:", rows)
    cur.close()
    conn.close()
except Exception as e:
    print("DB ERROR:", e)

print("--- Testing full login flow ---")
try:
    from app.database import get_db_connection
    from app.auth_utils import verify_password
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, password_hash FROM users WHERE email = %s", ("admin@cd.com",))
    user = cur.fetchone()
    print("User lookup result:", user)
    cur.close()
    conn.close()
except Exception as e:
    print("LOGIN FLOW ERROR:", e)
