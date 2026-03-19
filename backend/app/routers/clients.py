from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection
from pydantic import BaseModel
from typing import Optional
import psycopg2

router = APIRouter(prefix="/clients", tags=["Clients"])

class ClientCreate(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    industry: Optional[str] = "Retail"
    status: Optional[str] = "Stable"
    budget: Optional[str] = None


class EntityNameCreate(BaseModel):
    name: str

@router.get("")
def list_clients():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT client_id, client_name, website_url, industry, status, budget FROM clients ORDER BY client_name")
        rows = cur.fetchall()
        
        # Fetch projects and stakeholders for each client
        client_list = []
        for r in rows:
            client_id = r[0]
            # Fetch projects
            cur.execute("""
                SELECT p.project_id, p.project_name, p.project_status, p.start_date, p.end_date, pc.budget
                FROM projects p
                LEFT JOIN project_commercials pc ON p.project_id = pc.project_id
                WHERE p.client_id = %s
            """, (client_id,))
            proj_rows = cur.fetchall()
            
            projects = []
            stakeholders = []
            seen_stakeholders = set()

            for p in proj_rows:
                project_id = p[0]
                projects.append({
                    "id": project_id,
                    "name": p[1],
                    "status": p[2],
                    "start_date": p[3],
                    "end_date": p[4],
                    "budget": str(p[5]) if p[5] else "0"
                })

                # Fetch allocations for this project as stakeholders
                cur.execute("""
                    SELECT em.employee_name, pa.role_in_project, em.employee_id
                    FROM projects_allocation pa
                    JOIN employee_master em ON pa.employee_id = em.employee_id
                    WHERE pa.project_id = %s
                """, (project_id,))
                for s in cur.fetchall():
                    if s[2] not in seen_stakeholders:
                        stakeholders.append({
                            "name": s[0],
                            "role": s[1],
                            "id": s[2]
                        })
                        seen_stakeholders.add(s[2])

            client_list.append({
                "id": client_id,
                "name": r[1],
                "url": r[2],
                "industry": r[3],
                "status": r[4],
                "budget": float(r[5]) if r[5] else 0.0,
                "projects": projects,
                "stakeholders": stakeholders
            })
            
        return client_list
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

@router.delete("/{client_id}")
def delete_client(client_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM clients WHERE client_id = %s", (client_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check if project depends on it
        cur.execute("SELECT 1 FROM projects WHERE client_id = %s", (client_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete client - projects are associated with it.")

        cur.execute("DELETE FROM clients WHERE client_id = %s", (client_id,))
        conn.commit()
        return {"detail": "Client deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/simple")
def list_simple_clients():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT client_id, client_name FROM clients ORDER BY client_name")
        rows = cur.fetchall()
        return [{"id": r[0], "name": r[1]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("/simple")
def create_simple_client(payload: EntityNameCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Client name is required.")
        cur.execute("INSERT INTO clients (client_name) VALUES (%s) RETURNING client_id, client_name", (name,))
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Client already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/simple/{client_id}")
def update_simple_client(client_id: str, payload: EntityNameCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Client name is required.")
        cur.execute("UPDATE clients SET client_name = %s WHERE client_id = %s RETURNING client_id, client_name", (name, client_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client not found.")
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Client already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.delete("/simple/{client_id}")
def delete_simple_client(client_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE client_id = %s LIMIT 1", (client_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete client while projects are linked to it.")
        cur.execute("DELETE FROM clients WHERE client_id = %s RETURNING client_id", (client_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client not found.")
        conn.commit()
        return {"detail": "Client deleted successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.get("/partners")
def list_partners():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name FROM partners ORDER BY name")
        rows = cur.fetchall()
        return [{"id": r[0], "name": r[1]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.post("/partners")
def create_partner(payload: EntityNameCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Partner name is required.")
        cur.execute("INSERT INTO partners (name) VALUES (%s) RETURNING id, name", (name,))
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Partner already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.put("/partners/{partner_id}")
def update_partner(partner_id: int, payload: EntityNameCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Partner name is required.")
        cur.execute("UPDATE partners SET name = %s WHERE id = %s RETURNING id, name", (name, partner_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partner not found.")
        conn.commit()
        return {"id": row[0], "name": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Partner already exists.")
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)


@router.delete("/partners/{partner_id}")
def delete_partner(partner_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE partner_id = %s LIMIT 1", (partner_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete partner while projects are linked to it.")
        cur.execute("DELETE FROM partners WHERE id = %s RETURNING id", (partner_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partner not found.")
        conn.commit()
        return {"detail": "Partner deleted successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        release_db_connection(conn)
