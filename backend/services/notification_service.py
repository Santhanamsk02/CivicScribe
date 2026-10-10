import os
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Dict, Any

from dotenv import dotenv_values
from twilio.rest import Client
from fpdf import FPDF

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "officer_profile.json")
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")

os.makedirs(os.path.dirname(PROFILE_PATH), exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_env_config():
    # Dynamically read from .env so we don't rely on os.environ being stale
    return dotenv_values(ENV_PATH)


from services.supabase_service import test_supabase_connection

def get_officer_profile() -> Dict[str, Any]:
    try:
        supabase = test_supabase_connection()
        response = supabase.table("profiles").select("*").eq("role", "OFFICER").single().execute()
        if response.data:
            return response.data
    except Exception as e:
        logger.error(f"Could not fetch officer profile from Supabase: {e}")
        
    # Ultimate Fallback
    return {
        "name": "Santa",
        "email": "santhanakrishnan9360@gmail.com",
        "phone": "+919344088926",
        "designation": "City Administrator"
    }

def update_officer_profile(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        supabase = test_supabase_connection()
        response = supabase.table("profiles").update(data).eq("role", "OFFICER").execute()
        if response.data:
            return response.data[0]
    except Exception as e:
        logger.error(f"Could not update officer profile in Supabase: {e}")
        
    # Fallback to local
    with open(PROFILE_PATH, "w") as f:
        json.dump(data, f, indent=4)
    return data

def notify_officer(case_data: Dict[str, Any]):
    """
    Called when a complaint is filed or status changes.
    Determines severity and sends SMS / Calls / Email.
    """
    profile = get_officer_profile()
    
    case_number = case_data.get("case_number", "UNKNOWN")
    facts = case_data.get("extracted_facts", {})
    vision_result = facts.get("vision_result", {})
    
    # Try to find severity
    severity_score = 0
    if vision_result and isinstance(vision_result, dict):
        severity_score = vision_result.get("severity_score", 0)
        
    category = case_data.get("category", "General Issue")
    request_type = case_data.get("request_type", "GRIEVANCE")
    image_url = facts.get("image_url")
    
    # Send Email unconditionally
    _send_email_notification(profile, case_data, severity_score)

    # If severity > 50, call and SMS
    if severity_score > 50:
        _send_sms_alert(profile, case_number, severity_score)
        _make_urgent_call(profile, case_number, category)


def _send_email_notification(profile, case_data, severity_score):
    config = get_env_config()
    SMTP_USERNAME = config.get("SMTP_USERNAME")
    SMTP_PASSWORD = config.get("SMTP_PASSWORD")
    SMTP_SERVER = config.get("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(config.get("SMTP_PORT", 587))
    
    case_number = case_data.get("case_number", "UNKNOWN")
    request_type = case_data.get("request_type", "GRIEVANCE")
    category = case_data.get("category", "General Issue")
    original_desc = case_data.get("original_request", "Not provided")
    
    facts = case_data.get("extracted_facts", {})
    image_url = facts.get("image_url")
    location = facts.get("location", "Not specified")
    
    applicant = case_data.get("applicant_details", {})
    applicant_name = applicant.get("fullName", "Unknown")
    applicant_phone = applicant.get("phone", "Unknown")
    
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.info("=" * 60)
        logger.info(f"📧 [MOCK EMAIL] To: {profile['name']} <{profile['email']}>")
        logger.info(f"Subject: URGENT: New Civic {request_type} Filed - {case_number}")
        logger.info(f"Body: A new {request_type} has been reported. Category: {category}. Severity: {severity_score}/100. Attached: {image_url}")
        logger.info("=" * 60)
        return
        
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = profile['email']
        msg['Subject'] = f"URGENT: New Civic {request_type} Filed - {case_number}"
        
        body = f"""Dear {profile['name']},
        
A new {request_type} has been reported in the CivicScribe system.

--------------------------------------------------
CASE DETAILS:
--------------------------------------------------
Case Number: {case_number}
Category: {category}
Severity Score: {severity_score}/100
Location: {location}

--------------------------------------------------
CITIZEN'S ORIGINAL DESCRIPTION:
--------------------------------------------------
{original_desc}

--------------------------------------------------
APPLICANT DETAILS:
--------------------------------------------------
Name: {applicant_name}
Phone: {applicant_phone}

--------------------------------------------------
EVIDENCE / DOCUMENT:
--------------------------------------------------
"""
        if image_url:
            body += f"Image Link: {image_url}\n"
        else:
            body += "No image provided.\n"
            
        msg.attach(MIMEText(body, 'plain'))
        
        draft_text = case_data.get("draft")
        if draft_text:
            pdf = FPDF(format="A4")
            pdf.add_page()
            
            # Header Title
            pdf.set_font("Helvetica", style="B", size=22)
            pdf.set_text_color(15, 23, 42) # ink-900
            pdf.cell(0, 10, "CivicScribe Official Document", ln=True, align='C')
            
            # Subheader
            pdf.set_font("Helvetica", style="I", size=11)
            pdf.set_text_color(100, 116, 139) # ink-500
            pdf.cell(0, 6, f"Automated {request_type.capitalize()} Draft", ln=True, align='C')
            
            # Divider Line
            pdf.set_draw_color(226, 232, 240) # line color
            pdf.set_line_width(0.5)
            pdf.line(20, 32, 190, 32)
            pdf.ln(15)
            
            # Case Metadata block (Top Right)
            pdf.set_font("Helvetica", style="B", size=10)
            pdf.set_text_color(51, 65, 85)
            pdf.cell(0, 6, f"CASE NUMBER: {case_number}", ln=True, align='R')
            pdf.cell(0, 6, f"CATEGORY: {category.upper()}", ln=True, align='R')
            pdf.ln(10)
            
            # Main Draft Content (simulating paper padding)
            pdf.set_font("Helvetica", size=11)
            pdf.set_text_color(15, 23, 42)
            
            # fpdf2 multi_cell wrapping. Latin-1 encode to prevent character errors.
            clean_text = draft_text.encode('latin-1', 'replace').decode('latin-1')
            
            pdf.set_left_margin(25)
            pdf.set_right_margin(25)
            pdf.multi_cell(0, 7, txt=clean_text)
            
            # Footer
            pdf.set_y(-25)
            pdf.set_font("Helvetica", style="I", size=9)
            pdf.set_text_color(148, 163, 184)
            pdf.cell(0, 10, "Generated autonomously by CivicScribe AI Platform", align='C')
            
            pdf_bytes = pdf.output()
            
            pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
            pdf_attachment.add_header('Content-Disposition', f'attachment; filename="CivicScribe_{case_number}.pdf"')
            msg.attach(pdf_attachment)
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"✅ Real Email sent successfully to {profile['email']} with attached PDF Draft")
    except Exception as e:
        logger.error(f"❌ Failed to send real email: {e}")

def _send_sms_alert(profile, case_number, severity_score):
    config = get_env_config()
    TWILIO_ACCOUNT_SID = config.get("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = config.get("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER = config.get("TWILIO_PHONE_NUMBER")
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        logger.info("=" * 60)
        logger.info(f"📱 [MOCK SMS] Sending message to {profile['phone']}...")
        logger.info(f"Message: ALERT: High severity ({severity_score}/100) issue reported. Case {case_number}. Please check dashboard immediately.")
        logger.info("=" * 60)
        return
        
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"CivicScribe ALERT: High severity ({severity_score}/100) issue reported. Case {case_number}. Please check dashboard immediately.",
            from_=TWILIO_PHONE_NUMBER,
            to=profile['phone']
        )
        logger.info(f"✅ Real SMS dispatched to {profile['phone']}, SID: {message.sid}")
    except Exception as e:
        logger.error(f"❌ Failed to send real SMS: {e}")

def _make_urgent_call(profile, case_number, category):
    config = get_env_config()
    TWILIO_ACCOUNT_SID = config.get("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = config.get("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER = config.get("TWILIO_PHONE_NUMBER")
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        logger.info("=" * 60)
        logger.info(f"📞 [MOCK VOICE] Initiating voice call to {profile['phone']}...")
        logger.info(f"Twilio Voice Script: 'Hello {profile['name']}. This is an automated alert from Civic Scribe. A high severity {category} complaint has been filed. Case number {case_number}. Please take immediate action.'")
        logger.info("=" * 60)
        return
        
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        # Using TwiML to generate the voice speech
        twiml_script = f"""
        <Response>
            <Say voice="alice">Hello {profile['name']}. This is an automated alert from Civic Scribe. A high severity {category} complaint has been filed. Case number {case_number}. Please take immediate action.</Say>
        </Response>
        """
        call = client.calls.create(
            twiml=twiml_script,
            to=profile['phone'],
            from_=TWILIO_PHONE_NUMBER
        )
        logger.info(f"✅ Real Voice Call dispatched to {profile['phone']}, SID: {call.sid}")
    except Exception as e:
        logger.error(f"❌ Failed to make real call: {e}")

def notify_citizen_status_change(case_data: Dict[str, Any], new_status: str):
    config = get_env_config()
    TWILIO_ACCOUNT_SID = config.get("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = config.get("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER = config.get("TWILIO_PHONE_NUMBER")
    
    SMTP_USERNAME = config.get("SMTP_USERNAME")
    SMTP_PASSWORD = config.get("SMTP_PASSWORD")
    SMTP_SERVER = config.get("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(config.get("SMTP_PORT", 587))
    
    applicant = case_data.get("applicant_details", {})
    citizen_phone = applicant.get("phone")
    citizen_email = applicant.get("email")
    citizen_name = applicant.get("fullName", "Citizen")
    case_number = case_data.get("case_number", "UNKNOWN")
    
    # Send SMS
    if citizen_phone:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
            logger.info("=" * 60)
            logger.info(f"📱 [MOCK SMS] To Citizen: {citizen_phone}")
            logger.info(f"Message: CivicScribe Update: Your case {case_number} status has been updated to {new_status}.")
            logger.info("=" * 60)
        else:
            try:
                client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                message = client.messages.create(
                    body=f"CivicScribe Update: Your case {case_number} status has been updated to {new_status}.",
                    from_=TWILIO_PHONE_NUMBER,
                    to=citizen_phone
                )
                logger.info(f"✅ Real SMS dispatched to Citizen {citizen_phone}, SID: {message.sid}")
            except Exception as e:
                logger.error(f"❌ Failed to send citizen SMS: {e}")

    # Send Email
    if citizen_email:
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.info("=" * 60)
            logger.info(f"📧 [MOCK EMAIL] To Citizen: {citizen_email}")
            logger.info(f"Subject: CivicScribe Case Update - {case_number}")
            logger.info(f"Body: Dear {citizen_name}, your case {case_number} is now {new_status}.")
            logger.info("=" * 60)
        else:
            try:
                msg = MIMEMultipart()
                msg['From'] = SMTP_USERNAME
                msg['To'] = citizen_email
                msg['Subject'] = f"CivicScribe Case Update - {case_number}"
                
                body = f"""Dear {citizen_name},
                
This is an automated notification from CivicScribe. 

The status of your civic request (Case Number: {case_number}) has been updated.

New Status: {new_status}

You can track your case progress on the CivicScribe portal.

Thank you,
CivicScribe Administration
"""
                msg.attach(MIMEText(body, 'plain'))
                
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                logger.info(f"✅ Real Email dispatched to Citizen {citizen_email}")
            except Exception as e:
                logger.error(f"❌ Failed to send citizen Email: {e}")

