from fastapi import APIRouter, HTTPException, UploadFile, File
from uuid import uuid4

from models.schemas import (
    CreateCaseRequest,
    CreateCaseResponse,
    UpdateCaseStatusRequest,
    CaseStatusResponse
)

from services.supabase_service import test_supabase_connection
from services.cloudinary_service import upload_image
from services.vision_service import verify_resolution
from services.notification_service import notify_officer

router = APIRouter()

@router.post("/cases/{case_number}/resolve")
async def verify_and_resolve_case(case_number: str, file: UploadFile = File(...)):
    supabase = test_supabase_connection()
    try:
        # Get existing case
        response = supabase.table("cases").select("*").eq("case_number", case_number).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Case not found")
        case_data = response.data
        
        # Upload new image
        file_bytes = await file.read()
        cloudinary_result = upload_image(
            file_bytes=file_bytes,
            filename=file.filename or "resolved.jpg",
            content_type=file.content_type or "image/jpeg"
        )
        resolved_image_url = cloudinary_result.get("cloudinary_url")

        # Get original data
        original_request = case_data.get("original_request", "")
        facts = case_data.get("extracted_facts", {})
        original_image_url = facts.get("image_url", None)

        # Call AI Verification
        verification = verify_resolution(original_request, original_image_url, resolved_image_url)

        # If not resolved, return failure but don't update DB status to RESOLVED
        if not verification.get("resolved"):
            return {
                "success": False,
                "message": "AI could not verify that the issue is resolved.",
                "reason": verification.get("reason"),
                "resolved_image_url": resolved_image_url
            }

        # If resolved, update DB
        facts["resolved_image_url"] = resolved_image_url
        facts["resolution_verification"] = verification

        update_response = supabase.table("cases").update({
            "status": "RESOLVED",
            "extracted_facts": facts
        }).eq("case_number", case_number).execute()

        if not update_response.data:
             raise HTTPException(status_code=500, detail="Failed to update case in DB")

        return {
            "success": True,
            "message": "Case successfully verified and resolved.",
            "reason": verification.get("reason"),
            "resolved_image_url": resolved_image_url,
            "status": "RESOLVED"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



ALLOWED_STATUSES = [
    "DRAFT",
    "APPROVED",
    "SUBMITTED",
    "UNDER_REVIEW",
    "ACTION_IN_PROGRESS",
    "RESOLVED"
]


@router.post(
    "/cases",
    response_model=CreateCaseResponse
)
def create_case(request: CreateCaseRequest):

    supabase = test_supabase_connection()

    case_number = f"GS-{uuid4().hex[:8].upper()}"

    case_data = {
        "case_number": case_number,
        "original_request": request.original_request,
        "request_type": request.request_type,
        "category": request.category,
        "extracted_facts": request.extracted_facts.model_dump(),
        "draft": request.draft,
        "status": "DRAFT",
        "applicant_details": request.applicant_details or {}
    }

    try:

        response = (
            supabase
            .table("cases")
            .insert(case_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to create case"
            )

        created_case = response.data[0]

        try:
            notify_officer(created_case)
        except Exception as notify_err:
            print(f"Failed to send officer notification: {notify_err}")

        return {
            "id": created_case["id"],
            "case_number": created_case["case_number"],
            "status": created_case["status"],
            "message": "Case created successfully",
            "original_request": created_case.get("original_request"),
            "request_type": created_case.get("request_type"),
            "category": created_case.get("category"),
            "draft": created_case.get("draft"),
            "created_at": created_case.get("created_at")
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get(
    "/cases"
)
def get_all_cases():

    supabase = test_supabase_connection()

    try:

        response = (
            supabase
            .table("cases")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "cases": response.data or []
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get(
    "/cases/{case_number}"
)
def get_case(case_number: str):

    supabase = test_supabase_connection()

    try:

        response = (
            supabase
            .table("cases")
            .select("*")
            .eq("case_number", case_number)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Case not found"
            )

        return response.data

    except Exception as e:

        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )


@router.patch(
    "/cases/{case_number}/status",
    response_model=CaseStatusResponse
)
def update_case_status(
    case_number: str,
    request: UpdateCaseStatusRequest
):

    status = request.status.upper()

    if status not in ALLOWED_STATUSES:

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid case status",
                "allowed_statuses": ALLOWED_STATUSES
            }
        )

    supabase = test_supabase_connection()

    try:

        response = (
            supabase
            .table("cases")
            .update({
                "status": status
            })
            .eq("case_number", case_number)
            .execute()
        )

        if not response.data:

            raise HTTPException(
                status_code=404,
                detail="Case not found"
            )
            
        updated_case = response.data[0]
        
        from services.notification_service import notify_citizen_status_change
        try:
            notify_citizen_status_change(updated_case, status)
        except Exception as e:
            print(f"Failed to notify citizen: {e}")

        return {
            "case_number": case_number,
            "status": status,
            "message": "Case status updated successfully"
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )