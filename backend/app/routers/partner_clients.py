from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_db_connection, release_db_connection
import psycopg2

router = APIRouter(prefix="/partner-clients", tags=["Partner Clients"])


class PartnerClientCreate(BaseModel):
    name: str


@router.get("")
def list_partner_clients():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT partner_id, partner_name FROM partners ORDER BY partner_name")
        rows = cur.fetchall()
        return [{"id": r[0], "name": r[1]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("")
def create_partner_client(payload: PartnerClientCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Partner client name is required.")
        cur.execute("INSERT INTO partners (partner_name) VALUES (%s) RETURNING partner_id, partner_name", (name,))
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Partner client already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/{partner_client_id}")
def update_partner_client(partner_client_id: str, payload: PartnerClientCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Partner client name is required.")
        cur.execute("UPDATE partners SET partner_name = %s WHERE partner_id = %s RETURNING partner_id, partner_name", (name, partner_client_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partner client not found.")
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Partner client already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.delete("/{partner_client_id}")
def delete_partner_client(partner_client_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE partner_id = %s LIMIT 1", (partner_client_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete partner client while projects are linked to it.")
        cur.execute("DELETE FROM partners WHERE partner_id = %s RETURNING partner_id", (partner_client_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partner client not found.")
        conn.commit()
        return {"detail": "Partner client deleted successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
