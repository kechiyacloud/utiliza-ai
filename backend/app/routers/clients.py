from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, release_db_connection
from pydantic import BaseModel
from typing import Optional
import psycopg2

router = APIRouter(prefix="/clients", tags=["Clients"])
api_router = APIRouter(prefix="/api", tags=["Clients"])

class ClientCreate(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    industry: Optional[str] = "Retail"
    status: Optional[str] = "Stable"
    budget: Optional[float] = None

class ClientSimple(BaseModel):
    id: str
    name: str

class EntityNameCreate(BaseModel):
    name: str
    partner_id: Optional[str] = None



class ClientUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[str] = None


def _ensure_clients_table(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


def _detect_clients_schema(cur):
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'clients'
        """
    )
    columns = {row[0] for row in cur.fetchall()}
    if {"id", "name"}.issubset(columns):
        return "modern"
    if {"client_id", "client_name"}.issubset(columns):
        return "legacy"
    if "id" in columns and "name" in columns:
        return "modern"
    if "client_id" in columns and "client_name" in columns:
        return "legacy"
    return "modern"


def _fetch_client_rows(cur, search: Optional[str] = None):
    normalized_search = (search or "").strip()
    schema = _detect_clients_schema(cur)

    if schema == "legacy":
        query = "SELECT client_id::text AS id, client_name AS name FROM clients"
        params = []
        if normalized_search:
            query += " WHERE client_name ILIKE %s"
            params.append(f"%{normalized_search}%")
        query += " ORDER BY client_name"
    else:
        query = "SELECT id::text AS id, name FROM clients"
        params = []
        if normalized_search:
            query += " WHERE name ILIKE %s"
            params.append(f"%{normalized_search}%")
        query += " ORDER BY name"

    cur.execute(query, tuple(params))
    return [{"id": str(row[0]), "name": row[1]} for row in cur.fetchall()]


@router.get("")
@api_router.get("/clients")
def list_clients(search: Optional[str] = None, partner_id: Optional[str] = None):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)
        if schema == "modern":
            query = "SELECT id::text AS id, name FROM clients"
            params = []
            clauses = []
            if search:
                clauses.append("name ILIKE %s")
                params.append(f"%{search.strip()}%")
            if partner_id:
                # Only apply if column exists
                cur.execute("""
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = current_schema() AND table_name = 'clients' AND column_name = 'partner_id'
                """)
                if cur.fetchone():
                    clauses.append("partner_id = %s")
                    params.append(partner_id)
            if clauses:
                query += " WHERE " + " AND ".join(clauses)
            query += " ORDER BY name"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "name": r[1],
                    "url": None,
                    "industry": None,
                    "status": None,
                    "budget": 0.0,
                    "projects": [],
                    "stakeholders": [],
                }
                for r in rows
            ]

        clauses = []
        params = []
        if partner_id:
            clauses.append("partner_id = %s")
            params.append(partner_id)
        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cur.execute(f"SELECT client_id, client_name, website_url, industry, status, budget FROM clients {where_sql} ORDER BY client_name", tuple(params))
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
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)

        if schema == "modern":
            cur.execute("INSERT INTO clients (name) VALUES (%s) RETURNING id, name", (client.name,))
            row = cur.fetchone()
            conn.commit()
            return {"id": str(row[0]), "name": row[1]}

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


@router.put("/{client_id}")
def update_client(client_id: str, client: ClientUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM clients WHERE client_id = %s", (client_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Client not found")

        fields = []
        values = []

        if client.name is not None:
            fields.append("client_name = %s")
            values.append(client.name)
        if client.url is not None:
            fields.append("website_url = %s")
            values.append(client.url)
        if client.industry is not None:
            fields.append("industry = %s")
            values.append(client.industry)
        if client.status is not None:
            fields.append("status = %s")
            values.append(client.status)
        if client.budget is not None:
            fields.append("budget = %s")
            values.append(float(client.budget) if client.budget else 0.0)

        if not fields:
            return {"detail": "No changes supplied"}

        values.append(client_id)
        cur.execute(
            f"UPDATE clients SET {', '.join(fields)} WHERE client_id = %s",
            tuple(values)
        )
        conn.commit()
        return {"detail": "Client updated successfully"}
    except HTTPException:
        conn.rollback()
        raise
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
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)

        if schema == "modern":
            cur.execute("SELECT 1 FROM clients WHERE id = %s", (client_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Client not found")
            cur.execute("DELETE FROM clients WHERE id = %s", (client_id,))
            conn.commit()
            return {"detail": "Client deleted successfully"}

        cur.execute("SELECT 1 FROM clients WHERE client_id = %s", (client_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Client not found")

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
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)
        if schema == "modern":
            cur.execute("SELECT id::text, name FROM clients ORDER BY name")
        else:
            cur.execute("SELECT client_id, client_name FROM clients ORDER BY client_name")
        rows = cur.fetchall()
        return [{"id": str(r[0]), "name": r[1]} for r in rows]
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
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Client name is required.")
        partner_id = payload.partner_id
        if schema == "modern":
            cur.execute("INSERT INTO clients (name, partner_id) VALUES (%s, %s) RETURNING id, name", (name, partner_id))
        else:
            # legacy schema may not have partner_id; ignore if missing
            try:
                cur.execute("INSERT INTO clients (client_name, partner_id) VALUES (%s, %s) RETURNING client_id, client_name", (name, partner_id))
            except Exception:
                cur.execute("INSERT INTO clients (client_name) VALUES (%s) RETURNING client_id, client_name", (name,))
        row = cur.fetchone()
        conn.commit()
        return {"id": str(row[0]), "name": row[1]}
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
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Client name is required.")
        partner_id = payload.partner_id if hasattr(payload, "partner_id") else None
        if schema == "modern":
            cur.execute("UPDATE clients SET name = %s, partner_id = COALESCE(%s, partner_id) WHERE id = %s RETURNING id, name", (name, partner_id, client_id))
        else:
            try:
                cur.execute("UPDATE clients SET client_name = %s, partner_id = COALESCE(%s, partner_id) WHERE client_id = %s RETURNING client_id, client_name", (name, partner_id, client_id))
            except Exception:
                cur.execute("UPDATE clients SET client_name = %s WHERE client_id = %s RETURNING client_id, client_name", (name, client_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client not found.")
        conn.commit()
        return {"id": str(row[0]), "name": row[1]}
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
        _ensure_clients_table(cur)
        schema = _detect_clients_schema(cur)

        if schema == "modern":
            cur.execute("SELECT 1 FROM projects WHERE client_id = %s LIMIT 1", (client_id,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Cannot delete client while projects are linked to it.")
            cur.execute("DELETE FROM clients WHERE id = %s RETURNING id", (client_id,))
        else:
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
        cur.execute("SELECT partner_id, partner_name FROM partners ORDER BY partner_name")
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
        cur.execute("INSERT INTO partners (partner_name) VALUES (%s) RETURNING partner_id, partner_name", (name,))
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
def update_partner(partner_id: str, payload: EntityNameCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Partner name is required.")
        cur.execute("UPDATE partners SET partner_name = %s WHERE partner_id = %s RETURNING partner_id, partner_name", (name, partner_id))
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
def delete_partner(partner_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM projects WHERE partner_id = %s LIMIT 1", (partner_id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Cannot delete partner while projects are linked to it.")
        cur.execute("DELETE FROM partners WHERE partner_id = %s RETURNING partner_id", (partner_id,))
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
