"""Lazy-init AI clients.

Both Groq and Gemini are optional — if their API key is missing or the SDK
isn't installed, the corresponding getter returns None and callers fall through
to the next engine (or the heuristic fallback).
"""

import os

_groq_client = None
_groq_checked = False

_gemini_client = None
_gemini_checked = False


def get_groq_client():
    """Return a cached AsyncGroq client, or None if unavailable."""
    global _groq_client, _groq_checked
    if _groq_checked:
        return _groq_client
    _groq_checked = True
    try:
        from groq import AsyncGroq
        key = os.getenv("GROQ_API_KEY", "")
        if key and key.strip():
            _groq_client = AsyncGroq(api_key=key.strip())
            print(f"[AI] ✅ Groq client initialized (key: {key[:8]}...)")
        else:
            print("[AI] ⚠️  GROQ_API_KEY is empty or not set")
    except ImportError:
        print("[AI] ⚠️  groq package not installed — run: pip install groq")
    except Exception as e:
        print(f"[AI] ❌ Groq init error: {e}")
    return _groq_client


def get_gemini_client():
    """Return a cached Gemini client, or None if unavailable."""
    global _gemini_client, _gemini_checked
    if _gemini_checked:
        return _gemini_client
    _gemini_checked = True
    try:
        from google import genai
        key = os.getenv("GEMINI_API_KEY", "")
        if key and key.strip():
            _gemini_client = genai.Client(api_key=key.strip())
            print(f"[AI] ✅ Gemini client initialized (key: {key[:8]}...)")
        else:
            print("[AI] ⚠️  GEMINI_API_KEY is empty or not set")
    except ImportError:
        print("[AI] ⚠️  google-genai package not installed")
    except Exception as e:
        print(f"[AI] ❌ Gemini init error: {e}")
    return _gemini_client
