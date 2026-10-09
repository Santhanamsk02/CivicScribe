from supabase import create_client

from config.settings import settings


if not settings.supabase_url:
    raise ValueError("SUPABASE_URL is not configured")

if not settings.supabase_key:
    raise ValueError("SUPABASE_KEY is not configured")


supabase = create_client(
    settings.supabase_url,
    settings.supabase_key
)


def test_supabase_connection():
    return supabase

def test_supabase_role():
    response = supabase.rpc("get_my_role").execute()
    return response