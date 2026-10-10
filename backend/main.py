import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config.settings import settings
from routes.health import router as health_router
from routes.analyze import router as analyze_router
from routes.facts import router as facts_router
from routes.missing_info import router as missing_info_router
from routes.draft import router as draft_router
from routes.cases import router as cases_router
from routes.validation import router as validation_router
from routes.profile import router as profile_router
from routes.auth import router as auth_router

app = FastAPI(
    title=settings.app_name,
    description="AI-assisted RTI and Grievance drafting system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    health_router,
    prefix="/api"
)

app.include_router(
    analyze_router,
    prefix="/api"
)

app.include_router(
    facts_router,
    prefix="/api"
)

app.include_router(
    missing_info_router,
    prefix="/api"
)

app.include_router(
    cases_router,
    prefix="/api"
)

app.include_router(
    draft_router,
    prefix="/api"
)

app.include_router(
    validation_router,
    prefix="/api"
)

app.include_router(
    profile_router,
    prefix="/api"
)

app.include_router(
    auth_router,
    prefix="/api"
)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "The Grievance Scribe API is running"
    }