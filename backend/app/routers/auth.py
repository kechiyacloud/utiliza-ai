import re
from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection
from app.auth_utils import hash_password, verify_password, create_access_token
from pydantic import BaseModel


router = APIRouter()

def validate_password_strength(password: str) -> None:
    """Raise HTTPException(400) if the password does not meet policy."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=/\\\[\]]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character")

#-------------------- Register --------------------
class RegisterRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
def register_user(data: RegisterRequest):
    email = data.email
    password = data.password

    print("Registration request received:", email)

    # Enforce password strength policy (defense in depth — client can be bypassed)
    validate_password_strength(password)

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
            detail=str(e)
        )

    finally:
        cur.close()
        release_db_connection(conn)

#-------------------- Login --------------------

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login_user(data: LoginRequest):
    email = data.email
    password = data.password

    print("Login request received:", email)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get user
        cur.execute(
            "SELECT id, password_hash FROM users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        user_id, stored_hash = user

        # Verify password
        if not verify_password(password, stored_hash):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token = create_access_token(user_id, email)
        print("Login successful")

        return {
            "message": "Login successful",
            "user_id": user_id,
            "token": token
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        cur.close()
        release_db_connection(conn)