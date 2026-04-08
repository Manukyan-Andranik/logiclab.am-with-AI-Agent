# app/core/config.py
import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional
import dotenv
dotenv.load_dotenv()

class Settings(BaseSettings):
    # App
    APP_NAME: str = "LogicLab API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    BACKEND_CORS_ORIGINS: list = [
        "https://logiclab.am", 
        "https://www.logiclab.am",
        "http://localhost:8080", 
        "http://192.168.1.3:8080", 
        "http://localhost:8080",
        "http://127.0.0.1:8080", 
        "http://192.168.1.6:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # Email
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str = "LogicLab"
    ADMIN_EMAIL: Optional[str] = None
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 25 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".zip"}
    
    # Default Images
    DEFAULT_PROFILE_IMAGE: str = "https://res.cloudinary.com/dujmbcltl/image/upload/v1744535080/default_photo_adby1l.png"
    DEFAULT_COURSE_ICON: str = "https://res.cloudinary.com/demo/image/upload/v1622550000/sample.jpg"
    DEFAULT_PROJECT_IMAGE: str = "https://res.cloudinary.com/demo/image/upload/v1622550000/sample.jpg"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = "dujmbcltl"
    CLOUDINARY_API_KEY: str = "486986232445545"
    CLOUDINARY_API_SECRET: str = "QxZqJ3GJQ8X8NEdoS3qr6Zltilw"

    # Frontend URL
    FRONTEND_URL: str = "https://logiclab.am"

    # Navigation System Configuration
    # Values: "AGENT" (AI-powered navigation) or "TRADITIONAL" (standard navigation)
    NAVIGATION_SYSTEM: str = "AGENT"
    
    class Config:
        env_file = ".env"
        extra = "ignore"
        case_sensitive = True

settings = Settings()
