"""Auto-generate a main / driver around a user's bare function so it can be
executed against stdin/stdout test cases."""

import json
import re
from typing import Optional

from .clients import get_groq_client, get_gemini_client
from .prompts import RUNNER_PROMPT


def has_main(code: str, language: str) -> bool:
    """Detect whether the code already has an entry-point that reads stdin."""
    if language == "cpp":
        return bool(re.search(r"\b(?:int|void)\s+main\s*\(", code))
    if language == "java":
        return bool(re.search(r"public\s+static\s+void\s+main\s*\(", code))
    if language == "python":
        # Top-level call (not inside def/class) — heuristic: a non-indented line
        # that looks like a statement, after stripping decorators/imports/defs.
        for line in code.splitlines():
            if not line or line[0] in (" ", "\t", "#"):
                continue
            stripped = line.strip()
            if stripped.startswith(("def ", "class ", "import ", "from ", "@")):
                continue
            if "input(" in stripped or "sys.stdin" in stripped or stripped.startswith("print(") or "(" in stripped:
                return True
        return False
    return True  # other languages — don't try to wrap


async def generate_runner(code: str, language: str, test_cases: list) -> Optional[str]:
    """Ask the AI to wrap the user's code with a main that reads stdin per the
    test cases. Returns the wrapped program, or None if generation failed."""
    if not test_cases:
        return None

    sample_tcs = test_cases[:3]
    tc_text = "\n\n".join(
        f"--- Test case {i+1} ---\nstdin:\n{tc.get('input','')}\nexpected stdout:\n{tc.get('expected_output','')}"
        for i, tc in enumerate(sample_tcs)
    )
    user_msg = (
        f"Language: {language}\n\nUser's code (may lack a main):\n```{language}\n{code}\n```\n\n"
        f"Test cases the runner must satisfy:\n{tc_text}"
    )

    groq = get_groq_client()
    if groq:
        try:
            print(f"[AI] 🔧 Generating {language} runner via Groq...")
            response = await groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": RUNNER_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.1,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            wrapped = (data or {}).get("code", "").strip()
            if wrapped:
                print(f"[AI] ✅ Runner generated ({len(wrapped)} chars)")
                return wrapped
        except Exception as e:
            print(f"[AI] ❌ Groq runner failed: {e}")

    gemini = get_gemini_client()
    if gemini:
        try:
            print(f"[AI] 🔧 Generating {language} runner via Gemini...")
            response = gemini.models.generate_content(
                model="gemini-2.0-flash",
                contents=user_msg,
                config={
                    "system_instruction": RUNNER_PROMPT,
                    "temperature": 0.1,
                    "response_mime_type": "application/json",
                },
            )
            data = json.loads(response.text)
            wrapped = (data or {}).get("code", "").strip()
            if wrapped:
                return wrapped
        except Exception as e:
            print(f"[AI] ❌ Gemini runner failed: {e}")

    return None
