from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from psycopg2.extras import Json
from app.auth_utils import get_current_user
from app.rbac_utils import require_role
from app.database import db_cursor, get_db_connection, release_db_connection

_admin_only = require_role("master_admin")

router = APIRouter(prefix="/sub-roles", tags=["sub-roles"])


class SubRoleCreate(BaseModel):
    name: str
    label: str
    description: Optional[str] = None
    base_role: str
    page_access: List[str] = []
    field_restrictions: dict = {}


class SubRoleUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    base_role: Optional[str] = None
    page_access: Optional[List[str]] = None
    field_restrictions: Optional[dict] = None


VALID_PAGES = {
    'dashboard', 'projects', 'employees/list',
    'allocation', 'availability', 'client', 'settings'
}
VALID_BASE_ROLES = {'restricted_viewer', 'viewer', 'editor', 'master_admin'}


@router.get("/my-config")
def get_my_config(user=Depends(get_current_user)):
    """Returns the sub-role config for the calling user, or null if none assigned."""
    user_id = user.get('user_id')  # get_current_user returns {'user_id': ..., 'email': ..., 'role': ...}
    try:
        with db_cursor() as cur:
            cur.execute("""
                SELECT sr.sub_role_id, sr.name, sr.label, sr.description,
                       sr.base_role, sr.page_access, sr.field_restrictions
                FROM users u
                JOIN sub_roles sr ON u.sub_role_id = sr.sub_role_id
                WHERE u.id = %s
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            return {
                "sub_role_id": row[0],
                "name": row[1],
                "label": row[2],
                "description": row[3],
                "base_role": row[4],
                "page_access": row[5] or [],
                "field_restrictions": row[6] or {},
            }
    except Exception as e:
        print(f"Error fetching sub-role config: {e}")
        return None


@router.get("")
def list_sub_roles(admin=Depends(_admin_only)):
    """List all sub-roles. Master admin only."""
    with db_cursor() as cur:
        cur.execute("""
            SELECT sub_role_id, name, label, description, base_role, page_access, field_restrictions
            FROM sub_roles
            ORDER BY name
        """)
        rows = cur.fetchall()
        return [
            {
                "sub_role_id": row[0],
                "name": row[1],
                "label": row[2],
                "description": row[3],
                "base_role": row[4],
                "page_access": row[5] or [],
                "field_restrictions": row[6] or {},
            }
            for row in rows
        ]


@router.post("")
def create_sub_role(payload: SubRoleCreate, admin=Depends(_admin_only)):
    """Create a new sub-role. Master admin only."""
    if payload.base_role not in VALID_BASE_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid base_role. Must be one of: {sorted(VALID_BASE_ROLES)}")
    for page in payload.page_access:
        if page not in VALID_PAGES:
            raise HTTPException(status_code=400, detail=f"Invalid page: '{page}'. Valid pages: {sorted(VALID_PAGES)}")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO sub_roles (name, label, description, base_role, page_access, field_restrictions)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING sub_role_id
                """,
                (payload.name, payload.label, payload.description, payload.base_role,
                 payload.page_access, Json(payload.field_restrictions))
            )
            sub_role_id = cur.fetchone()[0]
            conn.commit()
            return {"message": "Sub-role created", "sub_role_id": sub_role_id}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="A sub-role with that name already exists")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)


@router.put("/{sub_role_id}")
def update_sub_role(sub_role_id: int, payload: SubRoleUpdate, admin=Depends(_admin_only)):
    """Update an existing sub-role. Master admin only."""
    if payload.base_role and payload.base_role not in VALID_BASE_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid base_role. Must be one of: {sorted(VALID_BASE_ROLES)}")
    if payload.page_access is not None:
        for page in payload.page_access:
            if page not in VALID_PAGES:
                raise HTTPException(status_code=400, detail=f"Invalid page: '{page}'. Valid pages: {sorted(VALID_PAGES)}")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        with conn.cursor() as cur:
            updates = []
            values = []

            if payload.label is not None:
                updates.append("label = %s")
                values.append(payload.label)
            if payload.description is not None:
                updates.append("description = %s")
                values.append(payload.description)
            if payload.base_role is not None:
                updates.append("base_role = %s")
                values.append(payload.base_role)
            if payload.page_access is not None:
                updates.append("page_access = %s")
                values.append(payload.page_access)
            if payload.field_restrictions is not None:
                updates.append("field_restrictions = %s")
                values.append(Json(payload.field_restrictions))

            if not updates:
                return {"message": "No updates provided"}

            updates.append("updated_at = NOW()")
            values.append(sub_role_id)
            query = f"UPDATE sub_roles SET {', '.join(updates)} WHERE sub_role_id = %s"

            cur.execute(query, tuple(values))
            if cur.rowcount == 0:
                conn.rollback()
                raise HTTPException(status_code=404, detail="Sub-role not found")

            conn.commit()
            return {"message": "Sub-role updated"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)


@router.delete("/{sub_role_id}")
def delete_sub_role(sub_role_id: int, admin=Depends(_admin_only)):
    """Delete a sub-role. Clears it from all assigned users first. Master admin only."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        with conn.cursor() as cur:
            # First check it exists
            cur.execute("SELECT sub_role_id FROM sub_roles WHERE sub_role_id = %s", (sub_role_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Sub-role not found")
            # Clear from all assigned users, then delete
            cur.execute("UPDATE users SET sub_role_id = NULL WHERE sub_role_id = %s", (sub_role_id,))
            cur.execute("DELETE FROM sub_roles WHERE sub_role_id = %s", (sub_role_id,))
            conn.commit()
            return {"message": "Sub-role deleted"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)
