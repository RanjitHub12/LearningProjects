"""Shared helpers used by upload sub-routers."""

from models import DifficultyLevel, SupportedLanguage


DIFFICULTY_MAP = {
    "Easy": DifficultyLevel.EASY,
    "Medium": DifficultyLevel.MEDIUM,
    "Hard": DifficultyLevel.HARD,
    "Impossible": DifficultyLevel.IMPOSSIBLE,
}

LANGUAGE_MAP = {
    "cpp": SupportedLanguage.CPP,
    "java": SupportedLanguage.JAVA,
    "python": SupportedLanguage.PYTHON,
    "sql": SupportedLanguage.SQL,
}


def normalize_output(s: str) -> str:
    """Trim trailing whitespace per line for tolerant stdout comparison."""
    return "\n".join(line.rstrip() for line in (s or "").strip().splitlines()).strip()
