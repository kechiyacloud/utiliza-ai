from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from app.database import get_db_connection, release_db_connection

router = APIRouter(tags=["Clients and Partners"])

# --- Models ---
class EntityCreate(BaseModel):
    name: str

# --- Clients API ---
@router.get("/clients")
def get_clients():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT client_id as id, client_name as name FROM clients ORDER BY client_name")
        clients = cur.fetchall()
        return clients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): release_db_connection(conn)

@router.post("/clients")
def create_client(client: EntityCreate):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Generate short ID since this is a quick-add point
        import uuid
        new_id = "CLI-" + str(uuid.uuid4())[:8].upper()
        cur.execute(
            "INSERT INTO clients (client_id, client_name) VALUES (%s, %s) RETURNING client_id as id, client_name as name",
            (new_id, client.name,)
        )
        new_client = cur.fetchone()
        conn.commit()
        return new_client
    except psycopg2.errors.UniqueViolation:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=400, detail="Client already exists")
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): release_db_connection(conn)

# --- Partners API ---
@router.get("/partners")
def get_partners():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT partner_id as id, partner_name as name FROM partners ORDER BY partner_name")
        partners = cur.fetchall()
        return partners
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): release_db_connection(conn)

@router.post("/partners")
def create_partner(partner: EntityCreate):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        import uuid
        new_id = "PRT-" + str(uuid.uuid4())[:8].upper()
        cur.execute(
            "INSERT INTO partners (partner_id, partner_name) VALUES (%s, %s) RETURNING partner_id as id, partner_name as name",
            (new_id, partner.name,)
        )
        new_partner = cur.fetchone()
        conn.commit()
        return new_partner
    except psycopg2.errors.UniqueViolation:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=400, detail="Partner already exists")
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): release_db_connection(conn)
