"""Lazy-init AI clients.

Both Groq and Gemini are optional — if their API key is missing or the SDK
isn't installed, the corresponding getter returns None and callers fall through
to the next engine (or the heuristic fallback).

Keys are sourced from `config.get_settings()` so Pydantic's `.env` loading is
the single source of truth — `os.getenv` would miss values that pydantic-settings
loaded only onto the Settings object (which is what happens when uvicorn is
launched without docker-compose exporting `.env` into the process environment).
"""

import os

from config import get_settings

_groq_client = None
_groq_checked = False

_gemini_client = None
_gemini_checked = False


def _resolve_key(attr: str, env_var: str) -> str:
    """Prefer the value pydantic-settings loaded from `.env`; fall back to the
    raw environment for deployments that inject keys outside the `.env` file
    (docker-compose, k8s secrets, CI). Empty/whitespace values are treated as
    missing in both layers."""
    settings_val = getattr(get_settings(), attr, "") or ""
    if settings_val.strip():
        return settings_val.strip()
    env_val = os.getenv(env_var, "") or ""
    return env_val.strip()


def get_groq_client():
    """Return a cached AsyncGroq client, or None if unavailable."""
    global _groq_client, _groq_checked
    if _groq_checked:
        return _groq_client
    _groq_checked = True
    try:
        from groq import AsyncGroq
        key = _resolve_key("groq_api_key", "GROQ_API_KEY")
        if key:
            _groq_client = AsyncGroq(api_key=key)
            print(f"[AI] Groq client initialized (key prefix: {key[:8]}...)")
        else:
            print("[AI] GROQ_API_KEY is empty or not set")
    except ImportError:
        print("[AI] groq package not installed -- run: pip install groq")
    except Exception as e:
        print(f"[AI] Groq init error: {e}")
    return _groq_client


def get_gemini_client():
    """Return a cached Gemini client, or None if unavailable."""
    global _gemini_client, _gemini_checked
    if _gemini_checked:
        return _gemini_client
    _gemini_checked = True
    try:
        from google import genai
        key = _resolve_key("gemini_api_key", "GEMINI_API_KEY")
        if key:
            _gemini_client = genai.Client(api_key=key)
            print(f"[AI] Gemini client initialized (key prefix: {key[:8]}...)")
        else:
            print("[AI] GEMINI_API_KEY is empty or not set")
    except ImportError:
        print("[AI] google-genai package not installed")
    except Exception as e:
        print(f"[AI] Gemini init error: {e}")
    return _gemini_client
