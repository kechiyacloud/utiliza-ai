from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from app.database import get_db_connection

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
        cur.execute("SELECT id, name FROM clients ORDER BY name")
        clients = cur.fetchall()
        return clients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.post("/clients")
def create_client(client: EntityCreate):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "INSERT INTO clients (name) VALUES (%s) RETURNING id, name",
            (client.name,)
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
        if 'conn' in locals(): conn.close()

# --- Partners API ---
@router.get("/partners")
def get_partners():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name FROM partners ORDER BY name")
        partners = cur.fetchall()
        return partners
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@router.post("/partners")
def create_partner(partner: EntityCreate):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "INSERT INTO partners (name) VALUES (%s) RETURNING id, name",
            (partner.name,)
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
        if 'conn' in locals(): conn.close()
