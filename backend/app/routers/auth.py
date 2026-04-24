import re
import os
import base64
import random
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from jose import jwt
from app.database import get_db_connection, release_db_connection
from app.auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM, REFRESH_TOKEN_EXPIRE_DAYS
from pydantic import BaseModel
from mailer import send_email

SECURE_COOKIES = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=SECURE_COOKIES,
        samesite="strict",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


router = APIRouter()

ALLOWED_EMAIL_DOMAIN = "@clouddestinations.com"

def _load_logo_b64() -> str:
    try:
        svg = Path(__file__).resolve().parents[3] / "frontend" / "public" / "vite.svg"
        return base64.b64encode(svg.read_bytes()).decode()
    except Exception:
        return ""

_LOGO_B64 = _load_logo_b64()

_EMAIL_WRAPPER = """
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:#1e3a5f;padding:28px 40px;text-align:center">
    <img src="data:image/svg+xml;base64,{logo}" width="52" height="52" alt="Utiliza AI" style="display:inline-block;vertical-align:middle" />
    <span style="display:inline-block;vertical-align:middle;margin-left:12px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px">Utiliza AI</span>
  </div>
  <div style="padding:36px 40px">
    {body}
  </div>
  <div style="background:#f8fafc;padding:14px 40px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">&copy; 2025 Cloud Destinations &middot; Utiliza AI</p>
  </div>
</div>
""".strip()

_OTP_BLOCK = """
<div style="background:#f0f8ff;border:2px solid #3BA9FB;border-radius:12px;text-align:center;padding:24px 16px;margin:24px 0">
  <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:#1e3a5f">{otp}</span>
</div>
""".strip()


def _build_email(title: str, intro: str, otp: str, note: str = "If you didn't request this, please ignore this email.") -> str:
    body = f"""
    <h2 style="color:#1e3a5f;font-size:18px;font-weight:700;margin:0 0 10px">{title}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0">{intro}</p>
    {_OTP_BLOCK.format(otp=otp)}
    <p style="color:#94a3b8;font-size:12px;margin:0">{note}</p>
    """.strip()
    return _EMAIL_WRAPPER.format(logo=_LOGO_B64, body=body)
EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

def validate_email(email: str) -> None:
    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=400, detail="Invalid email format. Use name@clouddestinations.com")
    if not email.lower().endswith(ALLOWED_EMAIL_DOMAIN):
        raise HTTPException(status_code=400, detail="Only @clouddestinations.com email addresses are allowed")

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

#-------------------- Send Registration OTP --------------------
class SendRegistrationOtpRequest(BaseModel):
    email: str
    password: str

@router.post("/send-registration-otp")
def send_registration_otp(data: SendRegistrationOtpRequest, bg: BackgroundTasks):
    email = data.email.lower().strip()

    validate_email(email)
    validate_password_strength(data.password)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        otp = str(random.randint(100000, 999999))
        expiry = datetime.utcnow() + timedelta(minutes=10)
        hashed_password = hash_password(data.password)

        cur.execute(
            """
            INSERT INTO pending_registrations (email, password_hash, otp, otp_expiry)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE
              SET password_hash = EXCLUDED.password_hash,
                  otp           = EXCLUDED.otp,
                  otp_expiry    = EXCLUDED.otp_expiry,
                  created_at    = CURRENT_TIMESTAMP
            """,
            (email, hashed_password, otp, expiry)
        )
        conn.commit()

        html = _build_email(
            title="Verify your email",
            intro="Use the OTP below to complete your Utiliza AI registration. It expires in <strong>10 minutes</strong>.",
            otp=otp,
        )
        bg.add_task(send_email, email, "Your Utiliza AI Registration OTP", html)

        return {"message": "OTP sent to your email."}

    except HTTPException:
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)

#-------------------- Register (verify OTP + create account) --------------------
class RegisterRequest(BaseModel):
    email: str
    otp: str

@router.post("/register")
def register_user(data: RegisterRequest):
    email = data.email.lower().strip()

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT password_hash, otp, otp_expiry FROM pending_registrations WHERE email = %s",
            (email,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=400, detail="No pending registration found. Please request an OTP first.")

        password_hash, stored_otp, expiry = row

        if stored_otp != data.otp.strip():
            raise HTTPException(status_code=400, detail="Invalid OTP.")

        if datetime.utcnow() > expiry:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

        cur.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s)",
            (email, password_hash)
        )
        cur.execute("DELETE FROM pending_registrations WHERE email = %s", (email,))
        conn.commit()

        return {"message": "User registered successfully"}

    except HTTPException:
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)

#-------------------- Login --------------------

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login_user(data: LoginRequest, response: Response):
    email = data.email
    password = data.password

    print("Login request received:", email)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
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

        if not verify_password(password, stored_hash):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token = create_access_token(user_id, email)
        refresh_token = create_refresh_token(user_id, email)
        set_refresh_cookie(response, refresh_token)
        print("Login successful")

        return {
            "message": "Login successful",
            "user_id": user_id,
            "token": token,
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

#-------------------- Refresh Token --------------------

@router.post("/refresh")
def refresh_access_token(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    new_access_token = create_access_token(int(user_id), email)
    new_refresh_token = create_refresh_token(int(user_id), email)
    set_refresh_cookie(response, new_refresh_token)

    return {"token": new_access_token}

#-------------------- Forgot Password --------------------

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, bg: BackgroundTasks):
    email = data.email.lower().strip()

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id FROM users WHERE email = %s AND is_active = true", (email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="This email ID is not registered.")

        otp = str(random.randint(100000, 999999))
        expiry = datetime.utcnow() + timedelta(minutes=10)

        cur.execute(
            "UPDATE users SET reset_otp = %s, reset_otp_expiry = %s WHERE email = %s",
            (otp, expiry, email)
        )
        conn.commit()

        html = _build_email(
            title="Password Reset OTP",
            intro="Use the OTP below to reset your Utiliza AI password. It expires in <strong>10 minutes</strong>.",
            otp=otp,
        )
        bg.add_task(send_email, email, "Your Utiliza AI Password Reset OTP", html)

        return {"message": "If that email exists, an OTP has been sent."}

    except HTTPException:
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)

#-------------------- Reset Password --------------------

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    email = data.email.lower().strip()

    validate_password_strength(data.new_password)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "SELECT reset_otp, reset_otp_expiry FROM users WHERE email = %s AND is_active = true",
            (email,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=400, detail="Invalid request")

        stored_otp, expiry = row

        if not stored_otp or stored_otp != data.otp.strip():
            raise HTTPException(status_code=400, detail="Invalid OTP")

        if not expiry or datetime.utcnow() > expiry:
            raise HTTPException(status_code=400, detail="OTP has expired")

        new_hash = hash_password(data.new_password)
        cur.execute(
            """UPDATE users
               SET password_hash = %s, reset_otp = NULL, reset_otp_expiry = NULL,
                   password_changed_at = NOW()
               WHERE email = %s""",
            (new_hash, email)
        )
        conn.commit()

        return {"message": "Password reset successfully"}

    except HTTPException:
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        release_db_connection(conn)