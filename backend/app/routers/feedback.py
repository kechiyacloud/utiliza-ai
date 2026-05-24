from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.database import get_db_connection, release_db_connection
from app.rbac_utils import require_min_role
import os
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(dependencies=[Depends(require_min_role("restricted_viewer"))])


class FeedbackRequest(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    employee_email: str
    subject: str
    description: str
    type: str      # "Bug" | "Feature Request" | "General"
    priority: str  # "Low" | "Medium" | "High"


def _push_feedback_to_redis(ticket_id, data_dict, created_at):
    try:
        import redis as redis_lib
        r = redis_lib.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            password=os.getenv("REDIS_PASSWORD") or None,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        payload = json.dumps({
            **data_dict,
            "ticket_id": ticket_id,
            "status": "open",
            "created_at": str(created_at),
        })
        r.lpush("feedback_tickets", payload)
    except Exception as redis_err:
        print(f"[Redis] Failed to push ticket: {redis_err}")


def _send_feedback_email(ticket_id, data_dict, created_at):
    try:
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASS")
        smtp_from = os.getenv("SMTP_FROM", smtp_user)
        recipients = [e.strip() for e in os.getenv("TEAM_EMAILS", "").split(",") if e.strip()]

        if not (smtp_user and smtp_password and recipients):
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{data_dict['priority']}] New Feedback #{ticket_id}: {data_dict['subject']}"
        msg["From"] = smtp_from
        msg["To"] = ", ".join(recipients)

        html = f"""
        <h2>New Feedback Ticket #{ticket_id}</h2>
        <p><b>From:</b> {data_dict.get('employee_name') or 'Unknown'} ({data_dict.get('employee_email')})</p>
        <p><b>Type:</b> {data_dict['type']} &nbsp;|&nbsp; <b>Priority:</b> {data_dict['priority']}</p>
        <p><b>Subject:</b> {data_dict['subject']}</p>
        <hr/>
        <p style="white-space: pre-wrap;">{data_dict['description']}</p>
        <hr/>
        <p style="color: #888; font-size: 12px;">Submitted via CD Utiliza AI &mdash; {str(created_at)}</p>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(
            os.getenv("SMTP_HOST", "smtp.gmail.com"),
            int(os.getenv("SMTP_PORT", 587))
        ) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, recipients, msg.as_string())
    except Exception as mail_err:
        print(f"[SMTP] Failed to send email: {mail_err}")


@router.post("/feedback")
def submit_feedback(data: FeedbackRequest, background_tasks: BackgroundTasks):
    valid_types = ["Bug", "Feature Request", "General"]
    valid_priorities = ["Low", "Medium", "High"]

    if data.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"type must be one of {valid_types}")
    if data.priority not in valid_priorities:
        raise HTTPException(status_code=400, detail=f"priority must be one of {valid_priorities}")

    conn = get_db_connection()
    ticket_id = None
    created_at = None
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO feedback_tickets
               (employee_id, employee_name, employee_email, subject, description, type, priority)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id, created_at""",
            (data.employee_id, data.employee_name, data.employee_email,
             data.subject, data.description, data.type, data.priority)
        )
        row = cur.fetchone()
        ticket_id, created_at = row[0], row[1]
        conn.commit()
        cur.close()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        release_db_connection(conn)

    data_dict = data.dict()
    background_tasks.add_task(_push_feedback_to_redis, ticket_id, data_dict, created_at)
    background_tasks.add_task(_send_feedback_email, ticket_id, data_dict, created_at)

    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": "Feedback submitted successfully"
    }
