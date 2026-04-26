"""
Health Check Router — System status endpoint.
"""

from fastapi import APIRouter

from config import get_settings
from schemas import HealthResponse

router = APIRouter(tags=["System"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Returns API health status."""
    return HealthResponse(
        status="ok",
        service="CodeVault API",
        version="0.1.0",
        environment=settings.environment,
    )
