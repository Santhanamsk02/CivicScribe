from fastapi import APIRouter
import json

from models.schemas import AnalyzeRequest, AnalyzeResponse
from services.ai_service import ask_llm

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_request(request: AnalyzeRequest):

    prompt = f"""
You are an AI civic request classification system.

Your task is to classify a citizen's request as either:

RTI
or
GRIEVANCE

Definitions:

RTI:
The citizen is primarily seeking existing information,
records, documents, data, expenditure details, decisions,
or other information held by a public authority.

GRIEVANCE:
The citizen is primarily requesting that an issue be
resolved, corrected, investigated, repaired, provided,
or otherwise acted upon.

Important rules:
1. Return exactly one type: RTI or GRIEVANCE.
2. Do not invent facts.
3. Identify the broad category.
4. Explain briefly why the request belongs to that type.
5. Identify what the citizen is requesting.

Citizen request:
{request.text}

Return ONLY valid JSON in this exact format:

{{
    "type": "RTI or GRIEVANCE",
    "category": "short category name",
    "reason": "short explanation",
    "requested_action_or_information": "what the citizen wants"
}}
"""

    result = ask_llm(prompt)

    import json

    result = result.strip()

    if result.startswith("```"):
        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

    try:
        data = json.loads(result)
    except json.JSONDecodeError:
        raise ValueError("LLM returned invalid JSON")

    return data

from fastapi import File, Form, UploadFile, HTTPException
from services.cloudinary_service import upload_image
from services.vision_service import analyze_image_against_complaint

@router.post("/analyze_with_image")
async def analyze_request_with_image(
    text: str = Form(...),
    latitude: str = Form(None),
    longitude: str = Form(None),
    file: UploadFile = File(...)
):
    try:
        file_bytes = await file.read()
        cloudinary_result = upload_image(
            file_bytes=file_bytes,
            filename=file.filename or "evidence.jpg",
            content_type=file.content_type or "image/jpeg"
        )
        image_url = cloudinary_result.get("cloudinary_url")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    prompt = f"""
You are an AI civic request classification system.

Your task is to classify a citizen's request as either:
RTI or GRIEVANCE

Definitions:

RTI:
The citizen is primarily seeking existing information,
records, documents, data, expenditure details, decisions,
or other information held by a public authority.

GRIEVANCE:
The citizen is primarily requesting that an issue be
resolved, corrected, investigated, repaired, provided,
or otherwise acted upon.

Important rules:
1. Return exactly one type: RTI or GRIEVANCE.
2. Do not invent facts.
3. Identify the broad category.
4. Explain briefly why the request belongs to that type.
5. Identify what the citizen is requesting.

Citizen request:
{text}

Return ONLY valid JSON in this exact format:

{{
    "type": "RTI or GRIEVANCE",
    "category": "short category name",
    "reason": "short explanation",
    "requested_action_or_information": "what the citizen wants"
}}
"""
    result = ask_llm(prompt).strip()
    if result.startswith("```"):
        result = result.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")

    vision_result = None
    try:
        vision_result = analyze_image_against_complaint(text, image_url)
    except Exception as e:
        print(f"Vision analysis failed: {e}")

    return {
        "analysis": data,
        "image_url": image_url,
        "vision_result": vision_result,
        "location": {"latitude": latitude, "longitude": longitude} if latitude else None
    }