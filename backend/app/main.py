# app/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
import os

from .models.models import Base
from .core.config import settings
from .core.database import engine, get_db
from .api.deps import get_current_admin

# Import routers

from .api.endpoints import (
    auth,
    courses,
    instructors,
    students,
    registrations,
    materials,
    projects,
    success_stories,
    visits,
    contact_messages,
    certificates,
    enrollments,
    uploads,
    logic
)
from .api.routers import admin


# delete all tables and recreate them (for development purposes)
# Base.metadata.drop_all(bind=engine)


# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Educational platform API for LogicLab",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to LogicLab API",
        "docs": "/api/docs",
        "version": settings.APP_VERSION
    }



# Include routers
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"]
)

app.include_router(
    courses.router,
    prefix="/api/courses",
    tags=["Courses"]
)

app.include_router(
    instructors.router,
    prefix="/api/instructors",
    tags=["Instructors"]
)

app.include_router(
    students.router,
    prefix="/api/students",
    tags=["Students"]
)

app.include_router(
    registrations.router,
    prefix="/api/registrations",
    tags=["Registrations"]
)

app.include_router(
    materials.router,
    prefix="/api/materials",
    tags=["Materials"]
)

app.include_router(
    projects.router,
    prefix="/api/projects",
    tags=["Projects"]
)

app.include_router(
    success_stories.router,
    prefix="/api/success-stories",
    tags=["Success Stories"]
)

app.include_router(
    visits.router,
    prefix="/api",
    tags=["Visits"]
)

app.include_router(
    contact_messages.router,
    prefix="/api/contact-messages",
    tags=["Contact Messages"]
)

app.include_router(
    certificates.router,
    prefix="/api/certificates",
    tags=["Certificates"]
)

app.include_router( # New router include
    enrollments.router,
    prefix="/api/enrollments",
    tags=["Enrollments"]
)

app.include_router( # New router include
    uploads.router,
    prefix="/api", # The upload router already has a /upload prefix
    tags=["Uploads"]
)

app.include_router(
    logic.router,
    prefix="/api/logic",
    tags=["Nexus AI Agent"]
)

app.include_router(
    admin.router,
    prefix="/api", # The admin router already has a /admin prefix
    tags=["Admin"]
)

# Exception handlers
from fastapi.responses import JSONResponse

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )