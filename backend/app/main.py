# app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

from .models.models import Base
from .core.config import settings
from .core.database import engine

# Import routers
from .api.endpoints import (
    student,
    auth,
    courses,
    instructors,
    students,
    registrations,
    materials,
    projects,
    daily_life,
    visits,
    contact_messages,
    certificates,
    enrollments,
    uploads,
    logic,
    config
)
from .api.routers import admin


# ---------------------------------------------------
# DATABASE INITIALIZATION (Development Only)
# ---------------------------------------------------

# DELETE ALL TABLES
# Base.metadata.drop_all(bind=engine)i

# ⚠️ In production, use Alembic instead of create_all
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------
# FASTAPI INITIALIZATION
# ---------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Educational platform API for LogicLab",
    root_path="/api",  
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# ---------------------------------------------------
# CORS CONFIGURATION
# ---------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------
# STATIC FILES
# ---------------------------------------------------

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ---------------------------------------------------
# BASIC ROUTES
# ---------------------------------------------------

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to LogicLab API",
        "documentation": "/docs",
        "openapi_schema": "/openapi.json",
        "version": settings.APP_VERSION
    }


# ---------------------------------------------------
# ROUTERS
# ---------------------------------------------------

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(instructors.router, prefix="/instructors", tags=["Instructors"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(registrations.router, prefix="/registrations", tags=["Registrations"])
app.include_router(materials.router, prefix="/materials", tags=["Materials"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(daily_life.router, prefix="/daily-life", tags=["Daily Life"])
app.include_router(visits.router, tags=["Visits"])
app.include_router(contact_messages.router, prefix="/contact-messages", tags=["Contact Messages"])
app.include_router(certificates.router, prefix="/certificates", tags=["Certificates"])
app.include_router(enrollments.router, prefix="/enrollments", tags=["Enrollments"])
app.include_router(uploads.router, tags=["Uploads"])  # router already defines its prefix
app.include_router(logic.router, prefix="/logic", tags=["Logic AI Agent"])
app.include_router(student.router, tags=["Student Dashboard"])
app.include_router(config.router, tags=["Configuration"])  # Config endpoints
app.include_router(admin.router, tags=["Admin"])  # router already defines its prefix


# ---------------------------------------------------
# EXCEPTION HANDLERS
# ---------------------------------------------------

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# ---------------------------------------------------
# LOCAL DEVELOPMENT ENTRYPOINT
# ---------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )