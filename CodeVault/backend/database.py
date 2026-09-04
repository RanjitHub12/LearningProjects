"""
CodeVault Database — SQLAlchemy Async Engine & Session
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.engine import make_url

from config import get_settings

settings = get_settings()


def _engine_options(database_url: str) -> dict:
    """Translate libpq's sslmode query parameter for asyncpg."""
    url = make_url(database_url)
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    clean_url = url.set(query=query)
    options = {"url": clean_url}
    if sslmode:
        options["connect_args"] = {"ssl": sslmode}
    return options

# ─── Async Engine ─────────────────────────────────────────────────
engine = create_async_engine(
    **_engine_options(settings.database_url),
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

# ─── Session Factory ─────────────────────────────────────────────
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ─── Base Model ──────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


# ─── Dependency Injection ────────────────────────────────────────
async def get_db() -> AsyncSession:
    """Yields an async database session for FastAPI dependency injection."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── Lifecycle ────────────────────────────────────────────────────
async def init_db():
    """Create all tables on startup (dev convenience)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_db():
    """Gracefully close engine connections on shutdown."""
    await engine.dispose()
