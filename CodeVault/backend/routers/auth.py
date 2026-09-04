"""Email/password authentication with JWT sessions stored in an HttpOnly cookie."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models import User

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
COOKIE_NAME = "codevault_session"


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_. -]+$")
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=72)


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool


def _token(user: User) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user.id), "exp": expires}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _set_session(response: Response, user: User) -> None:
    settings = get_settings()
    response.set_cookie(
        COOKIE_NAME,
        _token(user),
        httponly=True,
        secure=settings.environment.lower() == "production",
        samesite="none" if settings.environment.lower() == "production" else "lax",
        max_age=settings.access_token_expire_minutes * 60,
    )


async def get_current_user(
    request_cookie: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not request_cookie:
        raise HTTPException(status_code=401, detail="Authentication required")
    settings = get_settings()
    try:
        payload = jwt.decode(request_cookie, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User account is unavailable")
    return user


# FastAPI cannot bind a bare cookie argument unless it is declared with Cookie.
from fastapi import Cookie


async def current_user(
    codevault_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await get_current_user(codevault_session, db)


def _public_user(user: User) -> UserResponse:
    return UserResponse(id=str(user.id), username=user.username, email=user.email, is_admin=bool(user.is_admin))


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    duplicate = await db.execute(select(User).where(or_(User.email == payload.email, User.username == payload.username)))
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username is already registered")
    result = await db.execute(select(User.id).limit(1))
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode(),
        is_admin=result.scalar_one_or_none() is None,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    _set_session(response, user)
    return _public_user(user)


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    valid_password = bool(user and bcrypt.checkpw(payload.password.encode(), user.hashed_password.encode()))
    if not user or not user.is_active or not valid_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    _set_session(response, user)
    return _public_user(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(current_user)):
    return _public_user(user)
