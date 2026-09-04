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
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Truncate every vault-data table. Resets problems, solutions, and practice
    telemetry. Users/invitations are left alone so the auth surface still works.
    """
    _ensure_local(request)
    # Order matters even with cascade — TRUNCATE ... CASCADE handles deps cleanly.
    await db.execute(text(
        "TRUNCATE TABLE practice_attempts, problem_solutions, vault_problems "
        "RESTART IDENTITY CASCADE"
    ))
    await db.commit()
    return {"status": "ok", "message": "All vault data wiped."}
