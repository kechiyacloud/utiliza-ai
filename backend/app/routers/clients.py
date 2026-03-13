from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection
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

@router.get("")
def get_clients():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                c.client_id,
                c.client_name,
                c.website_url,
                c.industry,
                c.status,
                c.budget,
                COUNT(DISTINCT p.project_id) AS total_projects,
                COUNT(DISTINCT CASE WHEN LOWER(p.project_status) IN ('running', 'in progress', 'live', 'active') THEN p.project_id END) AS active_projects
            FROM clients c
            LEFT JOIN projects p ON p.client_id = c.client_id
            GROUP BY c.client_id, c.client_name, c.website_url, c.industry, c.status, c.budget
            ORDER BY c.client_name
        """)
        rows = cur.fetchall()
        return [
            {
                "id": r[0],
                "name": r[1],
                "url": r[2] or "",
                "industry": r[3] or "General",
                "status": r[4] or "Stable",
                "budget": str(r[5]) if r[5] else "0",
                "activeProjects": r[7] or 0,
                "totalProjects": r[6] or 0,
                "logo": (r[1] or "CL")[:2].upper(),
                "contact": "",
                "projects": []
            }
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


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
        release_db_connection(conn)
