import smtplib, os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

def send_email(to_email, subject, html_body):
    smtp_host = os.getenv('SMTP_HOST')
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    smtp_from = os.getenv('SMTP_FROM', smtp_user)

    print(f"[MAILER] Attempting to send email to={to_email}, from={smtp_from}, host={smtp_host}")

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[MAILER] ERROR: Missing SMTP config — host={smtp_host}, user={smtp_user}, pass={'SET' if smtp_pass else 'MISSING'}")
        return

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = smtp_from
    msg['To']      = to_email
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(smtp_host, 587, timeout=15) as server:
            server.set_debuglevel(1)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            result = server.sendmail(smtp_from, to_email, msg.as_string())
            print(f'[MAILER] Email sent successfully to {to_email}! SMTP response: {result}')
    except smtplib.SMTPAuthenticationError as e:
        print(f'[MAILER] SMTP AUTH FAILED: {e}')
    except smtplib.SMTPRecipientsRefused as e:
        print(f'[MAILER] RECIPIENTS REFUSED (SES sandbox?): {e}')
    except smtplib.SMTPException as e:
        print(f'[MAILER] SMTP ERROR: {e}')
    except Exception as e:
        print(f'[MAILER] UNEXPECTED ERROR: {type(e).__name__}: {e}')

if __name__ == "__main__":
    try:
        send_email('sprasanth@clouddestinations.com', 'Hello!', '<p>Welcome!</p>')
    except Exception as e:
        print(f"Failed to send email: {e}")
