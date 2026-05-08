import smtplib, os
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

env_file = os.path.join(os.path.dirname(__file__), ".env.local")
if not os.path.exists(env_file):
    env_file = os.path.join(os.path.dirname(__file__), ".env.prod")
if not os.path.exists(env_file):
    env_file = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_file)

def send_email(to_email, subject, html_body):
    smtp_host = os.getenv('SMTP_HOST')
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASS')
    smtp_from = os.getenv('SMTP_FROM', smtp_user)

    print(f"[MAILER] Attempting to send email to={to_email}, from={smtp_from}, host={smtp_host}")

    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[MAILER] ERROR: Missing SMTP config — host={smtp_host}, user={smtp_user}, pass={'SET' if smtp_password else 'MISSING'}")
        return

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = smtp_from
    msg['To']      = to_email
    msg.attach(MIMEText(html_body, 'html'))

    try:
        import time
        from socket import gaierror

        for attempt in range(3):  # Try up to 3 times
            try:
                with smtplib.SMTP(smtp_host, 587, timeout=20) as server:
                    server.set_debuglevel(1)
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    result = server.sendmail(smtp_from, to_email, msg.as_string())
                    if result:
                        print(f'[MAILER] WARNING: sendmail partial failure dict: {result}')
                    else:
                        print(f'[MAILER] {datetime.utcnow().isoformat()}Z — SES accepted {to_email} (empty result = 250 Ok, all recipients accepted at SMTP level). If not delivered, account is in SES Sandbox.')
                    return  # Success
            except (gaierror, ConnectionError, smtplib.SMTPConnectError) as e:
                print(f'[MAILER] Attempt {attempt+1} failed (Network/DNS error): {e}')
                if attempt < 2:
                    time.sleep(2)  # Wait before retrying
                else:
                    print(f'[MAILER] CRITICAL: All 3 attempts failed for {to_email}')
            except smtplib.SMTPRecipientsRefused as e:
                print(f'[MAILER] ERROR: Recipient refused at SMTP level — {dict(e.recipients)}')
                print(f'[MAILER] NOTE: SES Sandbox silent-drops show as 250 Ok (empty result above), NOT as SMTPRecipientsRefused. This error means SMTP-level rejection (suppression list or invalid address).')
                break # No retry for refused recipients
            except Exception as e:
                print(f'[MAILER] UNEXPECTED ERROR: {type(e).__name__}: {e}')
                break
    except Exception as e:
        print(f'[MAILER] Outer exception: {e}')

if __name__ == "__main__":
    try:
        send_email('sprasanth@clouddestinations.com', 'Hello!', '<p>Welcome!</p>')
    except Exception as e:
        print(f"Failed to send email: {e}")
