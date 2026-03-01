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
    allow_methods=["POST", "GET", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
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

import asyncio

def create_wsgi_app(asgi_app):
    def application(environ, start_response):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            content_length = int(environ.get("CONTENT_LENGTH", 0) or 0)
            body = environ["wsgi.input"].read(content_length) if content_length > 0 else b""
            
            scope = {
                "type": "http", 
                "asgi": {"version": "3.0"}, 
                "http_version": "1.1",
                "method": environ["REQUEST_METHOD"], 
                "scheme": environ.get("wsgi.url_scheme", "http"),
                "path": environ.get("PATH_INFO", "/"), 
                "query_string": environ.get("QUERY_STRING", "").encode(),
                "headers": _build_headers(environ),
                "server": (environ.get("SERVER_NAME", "localhost"), int(environ.get("SERVER_PORT", 80))),
            }
            
            response = {"status": 200, "headers": [], "body": []}
            
            async def receive(): 
                return {"type": "http.request", "body": body, "more_body": False}
            
            async def send(message):
                if message["type"] == "http.response.start":
                    response["status"] = message["status"]
                    response["headers"] = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    response["body"].append(message.get("body", b""))
            
            loop.run_until_complete(asgi_app(scope, receive, send))
            
            # Convert headers and ensure CORS headers are present
            headers = []
            cors_headers_added = False
            
            for k, v in response["headers"]:
                key = k.decode() if isinstance(k, bytes) else k
                value = v.decode() if isinstance(v, bytes) else v
                headers.append((key, value))
                if key.lower() == 'access-control-allow-origin':
                    cors_headers_added = True
            
            # If CORS headers weren't added by middleware, add them manually
            # This ensures CORS works even if middleware fails
            if not cors_headers_added:
                origin = environ.get('HTTP_ORIGIN', '')
                if origin:
                    headers.append(('Access-Control-Allow-Origin', origin))
                    headers.append(('Access-Control-Allow-Credentials', 'true'))
                    headers.append(('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'))
                    headers.append(('Access-Control-Allow-Headers', '*'))
            
            start_response(f"{response['status']} {_get_status_phrase(response['status'])}", headers)
            return [b"".join(response["body"])]
            
        except Exception as e:
            # IMPORTANT: Add CORS headers even for error responses
            error_headers = [
                ("Content-Type", "text/plain"),
                ("Access-Control-Allow-Origin", environ.get('HTTP_ORIGIN', '*')),
                ("Access-Control-Allow-Credentials", "true"),
            ]
            start_response("500 Internal Server Error", error_headers)
            return [f"Internal Server Error: {str(e)}".encode()]
        finally: 
            loop.close()
    return application
    
def _build_headers(environ):
    headers = []
    for key, value in environ.items():
        if key.startswith("HTTP_"): headers.append((key[5:].replace("_", "-").lower().encode(), value.encode()))
        elif key in ("CONTENT_TYPE", "CONTENT_LENGTH"): headers.append((key.replace("_", "-").lower().encode(), value.encode()))
    return headers

def _get_status_phrase(code):
    return {200: "OK", 201: "Created", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 500: "Internal Server Error"}.get(code, "Unknown")


application = create_wsgi_app(app)


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(
#         "app.main:app",
#         host="0.0.0.0",
#         port=8000,
#         reload=settings.DEBUG
#     )