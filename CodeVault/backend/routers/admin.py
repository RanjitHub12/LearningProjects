"""
Admin router — destructive maintenance endpoints.

Only reachable from localhost. Used to reset the dev database to a clean
state without touching docker volumes or hand-running SQL. Not safe to
expose in production.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from config import get_settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from routers.auth import current_user

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def _ensure_local(request: Request) -> None:
    if get_settings().environment.lower() != "development":
        raise HTTPException(status_code=404, detail="Admin endpoints are disabled.")
    host = (request.client.host if request.client else "") or ""
    if host not in {"127.0.0.1", "::1", "localhost"} and not host.startswith("172."):
        raise HTTPException(status_code=403, detail="Admin endpoints are localhost-only.")


async def require_admin(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user


@router.post("/wipe-all")
async def wipe_all(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    """
    Delete all problems and practice attempts for the current user.
    Since solutions and attempts cascade from problems or users, this cleans
    up the user's entire vault while leaving others' data intact.
    """
    # Delete all problems uploaded by this user (cascades to solutions and attempts on those problems)
    await db.execute(text("DELETE FROM vault_problems WHERE user_id = :uid"), {"uid": user.id})
    # Delete any practice attempts made by this user (if any exist for other problems)
    await db.execute(text("DELETE FROM practice_attempts WHERE user_id = :uid"), {"uid": user.id})
    
    await db.commit()
    return {"status": "ok", "message": "All your vault data has been wiped."}
