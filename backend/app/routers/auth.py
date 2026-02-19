from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import psycopg2.extras
from app.database import get_db_connection
from app.auth_utils import hash_password, verify_password

router = APIRouter()

# -------------------- Schemas --------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# -------------------- Routes --------------------
@router.post("/register")
def register_user(data: RegisterRequest):
    email = data.email
    password = data.password

    print("Registration request received:", email)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if user exists
        cur.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=409,
                detail="User already exists"
            )

        # Hash password
        hashed_password = hash_password(password)

        # Insert user
        cur.execute(
            """
            INSERT INTO users (email, password_hash)
            VALUES (%s, %s)
            """,
            (email, hashed_password)
        )

        conn.commit()
        print("User registered successfully")

        return {
            "message": "User registered successfully"
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

    finally:
        cur.close()
        conn.close()

    
@router.post("/login")
def login_user(data: LoginRequest):
    email = data.email
    password = data.password

    print("Login request received:", email)

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # Fetch user by email
        cur.execute(
            """
            SELECT id, email, password_hash
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cur.fetchone()
        print("Fetched user:", user)

        # 1️⃣ Email not found
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # 2️⃣ Password mismatch
        if not verify_password(password, user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid password"
            )

        print("User logged in successfully")

        # (Later you can add JWT / cookies here)
        return {
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "email": user["email"]
            }
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

    finally:
        cur.close()
        conn.close()
