"""AI engine — code analysis, runner generation, heuristic fallback.

Public API is exposed at this package level so callers don't have to know the
internal split. See:
  - analyzer.py  : analyze_code_file (Groq → Gemini → heuristic)
  - runner.py    : generate_runner, has_main
  - heuristic.py : offline analysis when no API keys are configured
"""

from .analyzer import analyze_code_file
from .runner import generate_runner, has_main

__all__ = ["analyze_code_file", "generate_runner", "has_main"]
