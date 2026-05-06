from mcp.server.fastmcp import FastMCP
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

mcp = FastMCP("Feedback Agent")


def _get_conn():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# ── READ TOOLS ────────────────────────────────────────────────────────────────

@mcp.tool()
def list_tickets(status: str = "open", ticket_type: str = None) -> list[dict]:
    """
    List feedback tickets from the database.
    status: open | in_progress | resolved | closed
    ticket_type: Bug | Feature Request | General  (omit to get all types)
    """
    conn = _get_conn()
    cur = conn.cursor()
    if ticket_type:
        cur.execute(
            """SELECT id, employee_name, subject, type, priority, status, assigned_to, created_at
               FROM feedback_tickets
               WHERE status = %s AND type = %s
               ORDER BY created_at DESC""",
            (status, ticket_type),
        )
    else:
        cur.execute(
            """SELECT id, employee_name, subject, type, priority, status, assigned_to, created_at
               FROM feedback_tickets
               WHERE status = %s
               ORDER BY created_at DESC""",
            (status,),
        )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "employee_name": r[1],
            "subject": r[2],
            "type": r[3],
            "priority": r[4],
            "status": r[5],
            "assigned_to": r[6],
            "created_at": str(r[7]),
        }
        for r in rows
    ]


@mcp.tool()
def list_bug_tickets(priority: str = None) -> list[dict]:
    """
    List only Bug-type tickets that are open or in_progress, sorted High → Medium → Low.
    Shows assigned_to so teammates know who is already working on what.
    priority filter: Low | Medium | High  (omit for all)
    """
    conn = _get_conn()
    cur = conn.cursor()
    if priority:
        cur.execute(
            """SELECT id, employee_name, subject, priority, status, assigned_to, created_at
               FROM feedback_tickets
               WHERE type = 'Bug' AND status IN ('open', 'in_progress') AND priority = %s
               ORDER BY
                 CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                 created_at DESC""",
            (priority,),
        )
    else:
        cur.execute(
            """SELECT id, employee_name, subject, priority, status, assigned_to, created_at
               FROM feedback_tickets
               WHERE type = 'Bug' AND status IN ('open', 'in_progress')
               ORDER BY
                 CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
                 created_at DESC"""
        )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "employee_name": r[1],
            "subject": r[2],
            "priority": r[3],
            "status": r[4],
            "assigned_to": r[5],
            "created_at": str(r[6]),
        }
        for r in rows
    ]


@mcp.tool()
def get_ticket(ticket_id: int) -> dict:
    """
    Get full details of a feedback ticket including the description (error message / bug report).
    """
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, employee_id, employee_name, employee_email,
                  subject, description, type, priority, status, assigned_to, created_at
           FROM feedback_tickets WHERE id = %s""",
        (ticket_id,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return {"error": f"Ticket #{ticket_id} not found"}
    return {
        "id": row[0],
        "employee_id": row[1],
        "employee_name": row[2],
        "employee_email": row[3],
        "subject": row[4],
        "description": row[5],
        "type": row[6],
        "priority": row[7],
        "status": row[8],
        "assigned_to": row[9],
        "created_at": str(row[10]),
    }


# ── CONCURRENT CLAIM TOOLS ────────────────────────────────────────────────────

@mcp.tool()
def claim_ticket(ticket_id: int, your_name: str) -> dict:
    """
    Atomically claim an open ticket so no two teammates pick up the same ticket.
    Only succeeds if the ticket is still 'open' and unassigned.
    your_name: your name (e.g. 'Prasanth')
    Returns the ticket if claimed, or tells you who already owns it.
    """
    conn = _get_conn()
    cur = conn.cursor()
    # Atomic UPDATE: only matches if status='open' AND assigned_to IS NULL
    cur.execute(
        """UPDATE feedback_tickets
           SET status = 'in_progress', assigned_to = %s
           WHERE id = %s AND status = 'open' AND assigned_to IS NULL
           RETURNING id, subject, status, assigned_to""",
        (your_name, ticket_id),
    )
    row = cur.fetchone()
    conn.commit()

    if row:
        cur.close()
        conn.close()
        return {
            "claimed": True,
            "id": row[0],
            "subject": row[1],
            "status": row[2],
            "assigned_to": row[3],
            "message": f"Ticket #{ticket_id} is now assigned to {your_name}. Go fix it!",
        }

    # Claim failed — find out why
    cur.execute(
        "SELECT status, assigned_to FROM feedback_tickets WHERE id = %s",
        (ticket_id,),
    )
    existing = cur.fetchone()
    cur.close()
    conn.close()

    if not existing:
        return {"claimed": False, "error": f"Ticket #{ticket_id} not found"}
    return {
        "claimed": False,
        "status": existing[0],
        "assigned_to": existing[1],
        "message": f"Ticket #{ticket_id} is already taken by '{existing[1]}' (status: {existing[0]})",
    }


@mcp.tool()
def release_ticket(ticket_id: int, your_name: str) -> dict:
    """
    Release a ticket you claimed back to 'open' so another teammate can pick it up.
    Only the person who claimed it can release it.
    """
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        """UPDATE feedback_tickets
           SET status = 'open', assigned_to = NULL
           WHERE id = %s AND assigned_to = %s
           RETURNING id, subject""",
        (ticket_id, your_name),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        return {"released": False, "message": f"Ticket #{ticket_id} is not assigned to {your_name}"}
    return {"released": True, "id": row[0], "subject": row[1], "message": f"Ticket #{ticket_id} released back to open"}


# ── STATUS UPDATE ─────────────────────────────────────────────────────────────

@mcp.tool()
def update_ticket_status(ticket_id: int, status: str) -> dict:
    """
    Update the status of a feedback ticket after investigating or resolving it.
    status: open | in_progress | resolved | closed
    """
    valid = ["open", "in_progress", "resolved", "closed"]
    if status not in valid:
        return {"error": f"status must be one of {valid}"}
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE feedback_tickets SET status = %s WHERE id = %s RETURNING id, status, assigned_to",
        (status, ticket_id),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        return {"error": f"Ticket #{ticket_id} not found"}
    return {"id": row[0], "status": row[1], "assigned_to": row[2], "message": f"Ticket #{ticket_id} marked as '{status}'"}


if __name__ == "__main__":
    mcp.run()
