from fastapi import APIRouter, HTTPException
from app.database import get_db_connection
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/clients", tags=["Clients"])

class ClientCreate(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    industry: Optional[str] = "Retail"
    status: Optional[str] = "Stable"
    budget: Optional[str] = None

@router.post("")
def create_client(client: ClientCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT client_id FROM clients WHERE client_id = %s", (client.id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Client ID already exists")

        budget_val = float(client.budget) if client.budget else 0.0

        cur.execute("""
            INSERT INTO clients (client_id, client_name, website_url, industry, status, budget)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (client.id, client.name, client.url, client.industry, client.status, budget_val))
        
        conn.commit()
        return {"detail": "Client created successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
