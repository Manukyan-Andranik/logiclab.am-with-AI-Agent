# app/api/endpoints/config.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class ConfigResponse(BaseModel):
    """Configuration details exposed to frontend"""
    navigation_system: str  # "AGENT" or "TRADITIONAL"


@router.get("/navigation", response_model=ConfigResponse)
async def get_navigation_config():
    """
    Get the navigation system configuration.
    
    Returns:
        - navigation_system: "AGENT" (AI-powered) or "TRADITIONAL" (standard)
    
    This endpoint is called by the frontend to determine which navigation mode to use.
    """
    return ConfigResponse(
        navigation_system=settings.NAVIGATION_SYSTEM
    )


@router.get("/status")
async def get_config_status():
    """
    Get the overall platform configuration status.
    """
    return {
        "navigation_system": settings.NAVIGATION_SYSTEM,
        "agent_enabled": settings.NAVIGATION_SYSTEM == "AGENT",
        "traditional_enabled": settings.NAVIGATION_SYSTEM == "TRADITIONAL"
    }
