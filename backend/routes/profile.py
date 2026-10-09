from fastapi import APIRouter
from typing import Dict, Any

from services.notification_service import get_officer_profile, update_officer_profile

router = APIRouter()

@router.get("/profile")
def get_profile():
    return get_officer_profile()

@router.post("/profile")
def set_profile(data: Dict[str, Any]):
    return update_officer_profile(data)
