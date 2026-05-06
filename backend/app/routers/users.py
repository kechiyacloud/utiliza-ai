from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db_connection, release_db_connection
from app.rbac_utils import require_role

router = APIRouter(prefix="/users", tags=["Users"])

_admin_only = require_role("master_admin")


class RoleAssignment(BaseModel):
    role_name: str


class SubRoleAssignment(BaseModel):
    sub_role_id: Optional[int] = None


@router.get("", dependencies=[Depends(_admin_only)])
def list_users():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT u.id, u.email, r.role_name, r.role_label, u.is_active, u.last_login_at,
                   u.sub_role_id, sr.name AS sub_role_name, sr.label AS sub_role_label
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.role_id
            LEFT JOIN sub_roles sr ON u.sub_role_id = sr.sub_role_id
            ORDER BY u.email
        """)
        rows = cur.fetchall()
        return [
            {
                "id": r[0],
                "email": r[1],
                "role_name": r[2],
                "role_label": r[3],
                "is_active": r[4],
                "last_login_at": r[5],
                "sub_role_id": r[6],
                "sub_role_name": r[7],
                "sub_role_label": r[8],
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/roles", dependencies=[Depends(_admin_only)])
def list_roles():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT role_id, role_name, role_label, description FROM roles ORDER BY role_id")
        rows = cur.fetchall()
        return [{"role_id": r[0], "role_name": r[1], "role_label": r[2], "description": r[3]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{user_id}/role", dependencies=[Depends(_admin_only)])
def assign_role(user_id: int, payload: RoleAssignment):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT role_id FROM roles WHERE role_name = %s", (payload.role_name,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail=f"Unknown role: {payload.role_name}")
        role_id = row[0]

        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute("UPDATE users SET role_id = %s WHERE id = %s", (role_id, user_id))
        conn.commit()
        return {"message": f"Role updated to '{payload.role_name}'"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{user_id}/sub-role", dependencies=[Depends(_admin_only)])
def assign_sub_role(user_id: int, payload: SubRoleAssignment):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        if payload.sub_role_id is not None:
            cur.execute("SELECT sub_role_id FROM sub_roles WHERE sub_role_id = %s", (payload.sub_role_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail=f"Sub-role {payload.sub_role_id} not found")

        cur.execute("UPDATE users SET sub_role_id = %s WHERE id = %s", (payload.sub_role_id, user_id))
        conn.commit()
        return {"message": "Sub-role updated"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.delete("/{user_id}", dependencies=[Depends(_admin_only)])
def deactivate_user(user_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
        conn.commit()
        return {"message": "User deactivated"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
