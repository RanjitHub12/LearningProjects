"""
CodeVault Configuration — Pydantic Settings
All values are loaded from environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application-wide configuration sourced from environment."""

    # ─── Application ──────────────────────────────────────────────
    app_name: str = "CodeVault"
    environment: str = "development"
    debug: bool = True

    # ─── Database ─────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://codevault:codevault_secret@localhost:5433/codevault_db"
    )

    # ─── Redis / Celery ───────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ─── JWT Auth ─────────────────────────────────────────────────
    jwt_secret: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # ─── Gemini AI ────────────────────────────────────────────────
    gemini_api_key: str = ""

    # ─── AWS S3 ───────────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "codevault-files"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton for app settings."""
    return Settings()
