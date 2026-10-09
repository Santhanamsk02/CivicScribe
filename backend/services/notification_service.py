import os
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any

from dotenv import dotenv_values
from twilio.rest import Client

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "officer_profile.json")
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")

os.makedirs(os.path.dirname(PROFILE_PATH), exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_env_config():
    # Dynamically read from .env so we don't rely on os.environ being stale
    return dotenv_values(ENV_PATH)


def get_officer_profile() -> Dict[str, Any]:
    if os.path.exists(PROFILE_PATH):
        with open(PROFILE_PATH, "r") as f:
            return json.load(f)
    return {
        "name": "Officer Default",
        "email": "officer@civicscribe.local",
        "phone": "+91 9999999999",
        "designation": "City Administrator"
    }

def update_officer_profile(data: Dict[str, Any]) -> Dict[str, Any]:
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
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"✅ Real Email sent successfully to {profile['email']}")
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

