"""
CodeVault — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import init_db, dispose_db
from routers import auth, problems
from routers import upload, execution, leetcode, admin, interactive
from routers.auth import current_user
from schemas import HealthResponse

settings = get_settings()
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]


# ─── Lifespan (startup/shutdown) ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: init DB on startup, close on shutdown."""
    print("CodeVault API starting up...")
    await init_db()
    yield
    print("CodeVault API shutting down...")
    await dispose_db()


# ─── App Factory ─────────────────────────────────────────────────
app = FastAPI(
    title="CodeVault API",
    description="AI-Powered Reverse LeetCode & Placement Preparation Platform",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS Middleware ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {"service": "CodeVault API", "status": "ok"}


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(
        status="ok",
        service="CodeVault API",
        version="0.1.0",
        environment=settings.environment,
    )


app.include_router(auth.router)
app.include_router(problems.router, dependencies=[Depends(current_user)])
app.include_router(upload.router, dependencies=[Depends(current_user)])
app.include_router(execution.router, dependencies=[Depends(current_user)])
app.include_router(interactive.router, dependencies=[Depends(current_user)])
app.include_router(leetcode.router, dependencies=[Depends(current_user)])
app.include_router(admin.router, dependencies=[Depends(current_user)])
