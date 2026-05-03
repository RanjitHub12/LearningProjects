"""Upload router package — combines /single, /save-from-workspace, /analyze
into one APIRouter mounted at /api/v1/upload by main.py."""

from fastapi import APIRouter

from .single import router as _single_router
from .workspace import router as _workspace_router
from .analyze import router as _analyze_router

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])
router.include_router(_single_router)
router.include_router(_workspace_router)
router.include_router(_analyze_router)

__all__ = ["router"]
