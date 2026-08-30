"""
Email Service module using Brevo Transactional Email API.
Handles automated student email notifications for scholarship applications and administrative decisions.
Strictly sends emails to the authenticated student's registered email address.
"""
import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

# Ensure .env is always loaded
load_dotenv()

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
RESEND_API_URL = "https://api.resend.com/emails"


def get_brevo_config():
    """Retrieve Brevo API configuration safely from environment."""
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "srinagapriya5@gmail.com").strip()
    sender_name = os.getenv("BREVO_SENDER_NAME", "ScholarAI Platform").strip()
    return api_key, sender_email, sender_name


def get_resend_config():
    """Retrieve Resend API configuration safely from environment as backup."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev").strip()
    test_email = os.getenv("RESEND_TEST_EMAIL", "").strip()
    return api_key, from_email, test_email


def check_email_service_configuration():
    """Diagnostic check run at backend startup to inspect email service status."""
    brevo_key, sender_email, sender_name = get_brevo_config()
    if brevo_key:
        logger.info(f"[EmailService] Brevo Transactional API Active (Sender: {sender_name} <{sender_email}>).")
        return {"status": "ACTIVE", "provider": "BREVO", "sender": sender_email}
    
    resend_key, resend_from, _ = get_resend_config()
    if resend_key:
        logger.info(f"[EmailService] Resend API Active (Sender: {resend_from}).")
        return {"status": "ACTIVE", "provider": "RESEND", "sender": resend_from}
        
    logger.warning("[EmailService] No email provider API key configured. Outgoing emails disabled.")
    return {"status": "DISABLED", "provider": None, "sender": None}


def _send_brevo_email(to_email: str, subject: str, html_content: str, text_content: str = "", student_name: str = "Student") -> dict:
    """
    Dispatches transactional email via Brevo API (https://api.brevo.com/v3/smtp/email).
    Guaranteed not to throw unhandled exceptions or disrupt application submission.
    Never logs or leaks API keys.
    """
    brevo_key, sender_email, sender_name = get_brevo_config()

    if not brevo_key:
        # Check fallback to Resend if Brevo is not configured
        resend_key, _, _ = get_resend_config()
        if resend_key:
            logger.info("[EmailService] Brevo key missing, routing via Resend fallback.")
            return _send_resend_fallback(to_email, subject, html_content, text_content)
        logger.warning("[EmailService] BREVO_API_KEY not configured. Skipping email dispatch.")
        return {"success": False, "reason": "NO_API_KEY"}

    if not to_email or not str(to_email).strip():
        logger.warning("[EmailService] No student recipient email provided. Skipping email dispatch.")
        return {"success": False, "reason": "NO_RECIPIENT"}

    target_email = str(to_email).strip()
    target_name = str(student_name).strip() if student_name else "Student"

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": target_email,
                "name": target_name
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }
    if text_content:
        payload["textContent"] = text_content

    headers = {
        "api-key": brevo_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "ScholarAI-NotificationService/1.0"
    }

    max_attempts = 2
    last_error = ""
    for attempt in range(1, max_attempts + 1):
        # 1. Try requests library
        try:
            import requests
            response = requests.post(
                BREVO_API_URL,
                json=payload,
                headers=headers,
                timeout=(8, 15)
            )
            if response.status_code in (200, 201, 202):
                res_json = response.json() if response.text else {}
                msg_id = res_json.get("messageId", "sent")
                logger.info(f"[EmailService] [Brevo] Successfully sent '{subject}' to {target_email} (ID: {msg_id})")
                return {"success": True, "id": msg_id, "provider": "BREVO"}
            else:
                err_body = response.text
                logger.error(f"[EmailService] [Brevo] API Error (Status {response.status_code}): {err_body}")
                last_error = f"HTTP {response.status_code}: {err_body}"
        except ImportError:
            # 2. Standard library urllib fallback
            try:
                import urllib.request
                import urllib.error
                import ssl
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(BREVO_API_URL, data=data, headers=headers, method="POST")
                ctx = ssl._create_unverified_context()
                with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
                    res_body = resp.read().decode("utf-8")
                    res_json = json.loads(res_body) if res_body else {}
                    msg_id = res_json.get("messageId", "sent")
                    logger.info(f"[EmailService] [Brevo urllib] Successfully sent '{subject}' to {target_email} (ID: {msg_id})")
                    return {"success": True, "id": msg_id, "provider": "BREVO"}
            except urllib.error.HTTPError as err:
                err_msg = err.read().decode("utf-8", errors="ignore")
                logger.error(f"[EmailService] [Brevo urllib] HTTP Error ({err.code}): {err_msg}")
                last_error = f"HTTP {err.code}: {err_msg}"
            except Exception as err:
                last_error = str(err)
                logger.warning(f"[EmailService] [Brevo urllib] Attempt {attempt} failed: {last_error}")
        except Exception as err:
            last_error = str(err)
            logger.warning(f"[EmailService] [Brevo] Attempt {attempt} failed: {last_error}")

        if attempt < max_attempts:
            import time
            time.sleep(1)

    logger.error(f"[EmailService] [Brevo] Failed delivery to {target_email} after {max_attempts} attempts: {last_error}")
    return {"success": False, "error": last_error, "provider": "BREVO"}


def _send_resend_fallback(to_email: str, subject: str, html_content: str, text_content: str = "") -> dict:
    """Fallback dispatcher using Resend API if Brevo is not configured."""
    api_key, from_email, test_email = get_resend_config()
    if not api_key:
        return {"success": False, "reason": "NO_FALLBACK_API_KEY"}

    is_sandbox = "onboarding@resend.dev" in from_email.lower()
    target_recipient = test_email if (is_sandbox and test_email) else str(to_email).strip()

    payload = {
        "from": f"ScholarAI Platform <{from_email}>",
        "to": [target_recipient],
        "subject": subject,
        "html": html_content,
    }
    if text_content:
        payload["text"] = text_content

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        import requests
        response = requests.post(RESEND_API_URL, json=payload, headers=headers, timeout=(8, 15))
        if response.status_code in (200, 201):
            return {"success": True, "id": response.json().get("id"), "provider": "RESEND"}
    except Exception as e:
        logger.error(f"[EmailService] Resend fallback failed: {e}")

    return {"success": False, "reason": "FALLBACK_FAILED"}


def _base_email_template(title: str, preheader: str, body_html: str) -> str:
    """Generate responsive, modern HTML email layout with styled cards."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
      <style>
        body {{ margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }}
        .wrapper {{ width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; }}
        .card {{ background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
        .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }}
        .header p {{ margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }}
        .content {{ padding: 28px 24px; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }}
        .badge-blue {{ background-color: #e0e7ff; color: #4338ca; }}
        .badge-green {{ background-color: #dcfce7; color: #15803d; }}
        .badge-red {{ background-color: #fee2e2; color: #b91c1c; }}
        .badge-purple {{ background-color: #ede9fe; color: #6d28d9; }}
        .info-box {{ background-color: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9; }}
        .info-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
        .info-row:last-child {{ margin-bottom: 0; }}
        .info-label {{ color: #64748b; font-weight: 500; }}
        .info-val {{ color: #0f172a; font-weight: 700; }}
        .footer {{ text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }}
        .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; margin-top: 16px; }}
      </style>
    </head>
    <body>
      <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        {preheader}
      </div>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <h1>ScholarAI Portal</h1>
            <p>Student Scholarship Management & Decision System</p>
          </div>
          <div class="content">
            {body_html}
          </div>
        </div>
        <div class="footer">
          <p>© {datetime.now().year} ScholarAI Platform. All rights reserved.</p>
          <p>You are receiving this automated email regarding your registered scholarship application.</p>
        </div>
      </div>
    </body>
    </html>
    """


def get_frontend_url() -> str:
    """Retrieve configurable Frontend Portal Base URL."""
    return os.getenv("FRONTEND_URL", "http://localhost:5173").strip().rstrip("/")


# 1. Application Submitted Notification
def send_application_submitted_email(
    student_email: str,
    student_name: str,
    scholarship_name: str,
    application_id: int,
    submitted_at: str = None
) -> dict:
    """Send confirmation email when student submits an application."""
    subject = "Scholarship Application Submitted"
    preheader = f"Application #{application_id} for {scholarship_name} has been received."
    sub_date = submitted_at or datetime.now().strftime("%B %d, %Y at %I:%M %p")
    track_url = f"{get_frontend_url()}/dashboard/applications?id={application_id}"

    body_html = f"""
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-blue">Application Submitted</span>
        <h2 style="margin: 12px 0 4px 0; color: #0f172a; font-size: 18px;">Application Successfully Received</h2>
        <p style="margin: 0; font-size: 14px; color: #475569;">Hello <strong>{student_name}</strong>, your application has been received and forwarded to college administration for verification.</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Application ID:</span>
          <span class="info-val">#{application_id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Scholarship:</span>
          <span class="info-val">{scholarship_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Submitted On:</span>
          <span class="info-val">{sub_date}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-val" style="color: #4338ca;">SUBMITTED (Pending Admin Review)</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Your supporting documents have been attached to your application. The administration committee will verify your details and eligibility. You can track real-time progress on your student portal.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{track_url}" class="btn">Track Application Status</a>
      </div>
    """
    return _send_brevo_email(student_email, subject, _base_email_template(subject, preheader, body_html), student_name=student_name)


# 2. Application Approved Notification
def send_application_approved_email(
    student_email: str,
    student_name: str,
    scholarship_name: str,
    application_id: int,
    grant_amount: str = None,
    admin_notes: str = None
) -> dict:
    """Send congratulations email when administrator approves an application."""
    subject = "Scholarship Application Approved"
    preheader = f"Congratulations! Your application #{application_id} for {scholarship_name} has been APPROVED."
    amt_text = grant_amount or "Standard Grant"
    remarks = admin_notes or "Application approved by scholarship administration committee after document verification."
    track_url = f"{get_frontend_url()}/dashboard/applications?id={application_id}"

    body_html = f"""
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-green">Approved ✔</span>
        <h2 style="margin: 12px 0 4px 0; color: #15803d; font-size: 20px;">Congratulations {student_name}!</h2>
        <p style="margin: 0; font-size: 14px; color: #475569;">Your scholarship application has been officially <strong>APPROVED</strong>.</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Application ID:</span>
          <span class="info-val">#{application_id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Scholarship Scheme:</span>
          <span class="info-val">{scholarship_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Grant Amount:</span>
          <span class="info-val" style="color: #15803d;">{amt_text}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Final Decision:</span>
          <span class="info-val" style="color: #15803d;">Approved</span>
        </div>
      </div>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <strong style="font-size: 12px; color: #15803d; text-transform: uppercase; display: block; margin-bottom: 4px;">Admin Remarks:</strong>
        <p style="margin: 0; font-size: 13px; color: #166534;">{remarks}</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{track_url}" class="btn" style="background-color: #16a34a;">View Approved Application</a>
      </div>
    """
    return _send_brevo_email(student_email, subject, _base_email_template(subject, preheader, body_html), student_name=student_name)


# 3. Application Rejected Notification
def send_application_rejected_email(
    student_email: str,
    student_name: str,
    scholarship_name: str,
    application_id: int,
    rejection_reason: str
) -> dict:
    """Send formal decision notification when administrator rejects an application."""
    subject = "Scholarship Application Rejected"
    preheader = f"Update regarding application #{application_id} for {scholarship_name}."
    reason_text = rejection_reason or "Does not meet specific eligibility or documentation criteria."
    track_url = f"{get_frontend_url()}/dashboard/applications?id={application_id}"

    body_html = f"""
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-red">Application Declined</span>
        <h2 style="margin: 12px 0 4px 0; color: #b91c1c; font-size: 18px;">Application Status Update</h2>
        <p style="margin: 0; font-size: 14px; color: #475569;">Dear {student_name}, thank you for your application.</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Application ID:</span>
          <span class="info-val">#{application_id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Scholarship Scheme:</span>
          <span class="info-val">{scholarship_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-val" style="color: #b91c1c;">Rejected</span>
        </div>
      </div>

      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <strong style="font-size: 12px; color: #b91c1c; text-transform: uppercase; display: block; margin-bottom: 4px;">Reason for Rejection:</strong>
        <p style="margin: 0; font-size: 13px; color: #991b1b;">{reason_text}</p>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        You can explore other suitable scholarships matching your academic and financial criteria on the scholarship discovery portal.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{track_url}" class="btn">View Application Details</a>
      </div>
    """
    return _send_brevo_email(student_email, subject, _base_email_template(subject, preheader, body_html), student_name=student_name)


# 4. Application Under Review Notification
def send_application_review_email(
    student_email: str,
    student_name: str,
    scholarship_name: str,
    application_id: int,
    admin_notes: str = None
) -> dict:
    """Send notification when administrator marks an application Under Review."""
    subject = "Scholarship Application Under Review"
    preheader = f"Application #{application_id} for {scholarship_name} is currently under verification."
    notes = admin_notes or "Your application and certificates are currently being reviewed by the administration committee."
    track_url = f"{get_frontend_url()}/dashboard/applications?id={application_id}"

    body_html = f"""
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-purple">Under Review ⏳</span>
        <h2 style="margin: 12px 0 4px 0; color: #6d28d9; font-size: 18px;">Application Under Review</h2>
        <p style="margin: 0; font-size: 14px; color: #475569;">Hello {student_name}, your scholarship application is actively being verified.</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Application ID:</span>
          <span class="info-val">#{application_id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Scholarship:</span>
          <span class="info-val">{scholarship_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Current Stage:</span>
          <span class="info-val" style="color: #6d28d9;">Under Review</span>
        </div>
      </div>

      <div style="background-color: #faf5ff; border-left: 4px solid #a855f7; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <strong style="font-size: 12px; color: #6d28d9; text-transform: uppercase; display: block; margin-bottom: 4px;">Review Notes:</strong>
        <p style="margin: 0; font-size: 13px; color: #581c87;">{notes}</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{track_url}" class="btn" style="background-color: #7c3aed;">Track Progress</a>
      </div>
    """
    return _send_brevo_email(student_email, subject, _base_email_template(subject, preheader, body_html), student_name=student_name)


# 5. Scholarship Deadline Reminder Notification
def send_deadline_reminder_email(
    student_email: str,
    student_name: str,
    scholarship_name: str,
    days_remaining: int,
    deadline_date: str
) -> dict:
    """Send deadline reminder email to eligible student before scheme closes."""
    subject = f"Deadline Reminder: {scholarship_name} closes in {days_remaining} day{'s' if days_remaining != 1 else ''}"
    preheader = f"Action required: {scholarship_name} application deadline is approaching on {deadline_date}."
    apply_url = f"{get_frontend_url()}/dashboard/recommendations"

    body_html = f"""
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="badge badge-red">⏰ Deadline Approaching</span>
        <h2 style="margin: 12px 0 4px 0; color: #0f172a; font-size: 18px;">Don't Miss Your Scholarship Opportunity</h2>
        <p style="margin: 0; font-size: 14px; color: #475569;">Hello {student_name}, a scholarship scheme matching your profile closes soon.</p>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Scholarship Scheme:</span>
          <span class="info-val">{scholarship_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Application Deadline:</span>
          <span class="info-val" style="color: #b91c1c;">{deadline_date} ({days_remaining} days left)</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Ensure your documents (Aadhaar, income certificate, marksheets) are verified on your profile to submit your application on time.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="{apply_url}" class="btn">Apply Before Deadline</a>
      </div>
    """
    return _send_brevo_email(student_email, subject, _base_email_template(subject, preheader, body_html), student_name=student_name)
