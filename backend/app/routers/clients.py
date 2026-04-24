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
    partner_id: Optional[str] = None

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

        client_list = []
        if not rows:
            return client_list
            
        client_ids = [r[0] for r in rows]
        
        # 1. Fetch all projects for all matched clients in one go
        placeholders = ",".join(["%s"] * len(client_ids))
        cur.execute(f"""
            SELECT p.client_id, p.project_id, p.project_name, p.project_status, p.start_date, p.end_date, pc.budget
            FROM projects p
            LEFT JOIN project_commercials pc ON p.project_id = pc.project_id
            WHERE p.client_id IN ({placeholders})
        """, tuple(client_ids))
        proj_rows = cur.fetchall()
        
        projects_by_client = {}
        project_ids = []
        for p in proj_rows:
            c_id = p[0]
            if c_id not in projects_by_client:
                projects_by_client[c_id] = []
            projects_by_client[c_id].append({
                "id": p[1],
                "name": p[2],
                "status": p[3],
                "start_date": p[4],
                "end_date": p[5],
                "budget": str(p[6]) if p[6] else "0"
            })
            project_ids.append(p[1])
            
        # 2. Fetch all stakeholders for all matched projects in one go
        stakeholders_by_client = {}
        if project_ids:
            p_placeholders = ",".join(["%s"] * len(project_ids))
            cur.execute(f"""
                SELECT p.client_id, em.employee_name, pa.role_in_project, em.employee_id
                FROM projects_allocation pa
                JOIN employee_master em ON pa.employee_id = em.employee_id
                JOIN projects p ON pa.project_id = p.project_id
                WHERE pa.project_id IN ({p_placeholders})
            """, tuple(project_ids))
            
            sh_rows = cur.fetchall()
            seen_stakeholders_by_client = {}
            for s in sh_rows:
                c_id = s[0]
                emp_id = s[3]
                
                if c_id not in stakeholders_by_client:
                    stakeholders_by_client[c_id] = []
                    seen_stakeholders_by_client[c_id] = set()
                    
                if emp_id not in seen_stakeholders_by_client[c_id]:
                    stakeholders_by_client[c_id].append({
                        "name": s[1],
                        "role": s[2],
                        "id": emp_id
                    })
                    seen_stakeholders_by_client[c_id].add(emp_id)

        # 3. Assemble final list
        for r in rows:
            c_id = r[0]
            client_list.append({
                "id": c_id,
                "name": r[1],
                "url": r[2],
                "industry": r[3],
                "status": r[4],
                "budget": float(r[5]) if r[5] else 0.0,
                "projects": projects_by_client.get(c_id, []),
                "stakeholders": stakeholders_by_client.get(c_id, [])
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
            cur.execute("INSERT INTO clients (name, partner_id) VALUES (%s, %s) RETURNING id, name", (client.name, client.partner_id))
            row = cur.fetchone()
            conn.commit()
            return {"id": str(row[0]), "name": row[1]}

        cur.execute("SELECT client_id FROM clients WHERE client_id = %s", (client.id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Client ID already exists")

        budget_val = float(client.budget) if client.budget else 0.0

        if client.partner_id:
            cur.execute("""
                INSERT INTO clients (client_id, client_name, website_url, industry, status, budget, partner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (client.id, client.name, client.url, client.industry, client.status, budget_val, client.partner_id))
        else:
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
        
        # Check if partner_id exists
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'clients' AND column_name = 'partner_id'")
        has_partner = bool(cur.fetchone())
        
        if schema == "modern":
            if has_partner:
                cur.execute("SELECT id::text, name, partner_id FROM clients ORDER BY name")
            else:
                cur.execute("SELECT id::text, name, NULL AS partner_id FROM clients ORDER BY name")
        else:
            if has_partner:
                cur.execute("SELECT client_id, client_name, partner_id FROM clients ORDER BY client_name")
            else:
                cur.execute("SELECT client_id, client_name, NULL AS partner_id FROM clients ORDER BY client_name")
                
        rows = cur.fetchall()
        return [{"id": str(r[0]), "name": r[1], "partner_id": str(r[2]) if r[2] else None} for r in rows]
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
