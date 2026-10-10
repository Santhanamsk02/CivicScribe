import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.supabase_service import test_supabase_connection

router = APIRouter()

class LoginRequest(BaseModel):
    role: str

@router.post("/login")
def login(request: LoginRequest):
    supabase = test_supabase_connection()
    try:
        response = (
            supabase
            .table("profiles")
            .select("*")
            .eq("role", request.role)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Role not found in DB")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}. Make sure the 'profiles' table exists in Supabase.")

