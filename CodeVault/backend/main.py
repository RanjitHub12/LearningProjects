"""
CodeVault — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import init_db, dispose_db
from routers import health, problems
from routers import upload, execution

settings = get_settings()


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
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ────────────────────────────────────────────
app.include_router(health.router)
app.include_router(problems.router)
app.include_router(upload.router)
app.include_router(execution.router)
