"""Backwards-compat shim — the AI engine now lives in services.ai.

Existing imports keep working; new code should import from `services.ai`.
"""

from services.ai import analyze_code_file, generate_runner, has_main

# Old private name used by routers/upload.py before the split
_has_main = has_main

__all__ = ["analyze_code_file", "generate_runner", "has_main", "_has_main"]
