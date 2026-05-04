"""Deep-scan code analyzer — Groq primary, Gemini fallback, heuristic last resort."""

import json
import traceback

from .clients import get_groq_client, get_gemini_client
from .prompts import EXTRACTION_PROMPT
from .heuristic import heuristic_analyze


async def analyze_code_file(content: str, filename: str, language: str, hint: str = "") -> dict:
    """Analyze a code file using Groq, then Gemini, then heuristics. ``hint`` is
    optional human-supplied context (problem title, what the code is trying to
    do) appended to the prompt when the AI can't infer the problem on its own."""

    groq = get_groq_client()
    if groq:
        try:
            print(f"[AI] Analyzing '{filename}' with Groq LLaMA 3.3...")
            result = await _groq_analyze(groq, content, filename, language, hint)
            print(f"[AI] Groq analysis complete -- title: '{result.get('title', '?')}', "
                  f"approaches: {len(result.get('extracted_approaches', []))}")
            result["_engine"] = "groq"
            return result
        except Exception as e:
            print(f"[AI] Groq full extraction failed for '{filename}': {e}")
            traceback.print_exc()
            # Try a much smaller "essentials only" prompt before falling out
            # to Gemini -- full extraction can fail on long files due to
            # JSON-mode token truncation. Title/statement/tags/test_cases
            # alone almost always fit.
            try:
                print(f"[AI] Retrying with minimal Groq prompt for '{filename}'...")
                minimal = await _groq_minimal(groq, content, filename, language, hint)
                print(f"[AI] Minimal Groq complete -- title: '{minimal.get('title', '?')}'")
                minimal["_engine"] = "groq-minimal"
                return minimal
            except Exception as e2:
                print(f"[AI] Minimal Groq also failed: {e2}")

    gemini = get_gemini_client()
    if gemini:
        try:
            print(f"[AI] Analyzing '{filename}' with Gemini...")
            result = await _gemini_analyze(gemini, content, filename, language, hint)
            print(f"[AI] Gemini analysis complete -- title: '{result.get('title', '?')}'")
            result["_engine"] = "gemini"
            return result
        except Exception as e:
            print(f"[AI] Gemini failed for '{filename}': {e}")
            traceback.print_exc()

    print(f"[AI] Using heuristic fallback for '{filename}' (no AI engine available)")
    result = heuristic_analyze(content, filename, language)
    result["_engine"] = "heuristic"
    return result


async def _groq_minimal(client, content: str, filename: str, language: str, hint: str = "") -> dict:
    """Slimmer Groq call when the full extraction fails. Asks only for the
    essentials so the JSON is small enough to never get truncated.

    Uses ``llama-3.1-8b-instant`` rather than the 70B model so that a daily
    token-quota exhaustion on the big model doesn't take down this fallback
    too -- the 8B model has its own (much larger) free-tier bucket.
    """
    sys_msg = (
        "You analyze a single DSA solution file and return ONLY this JSON: "
        "{\"title\": \"...\", \"problem_statement\": \"...\", \"difficulty\": "
        "\"Easy|Medium|Hard\", \"dsa_tags\": [\"...\"], \"generated_test_cases\": "
        "[{\"input\": \"...\", \"expected_output\": \"...\", \"explanation\": \"...\"}]}. "
        "Use the filename as a strong hint for the problem title (kebab-case -> "
        "Title Case). Generate 2-3 stdin/stdout test cases. No prose, no markdown."
    )
    user_msg = (
        f"Filename: '{filename}'\nLanguage: {language}{_hint_block(hint)}\n\n"
        f"```{language}\n{content}\n```"
    )
    response = await client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )
    return _with_defaults(json.loads(response.choices[0].message.content))


def _hint_block(hint: str) -> str:
    return f"\n\nUser-provided context (use as authoritative — do not contradict):\n{hint.strip()}\n" if hint and hint.strip() else ""


async def _groq_analyze(client, content: str, filename: str, language: str, hint: str = "") -> dict:
    user_msg = (
        f"Analyze this {language} code file. The filename is '{filename}' but DO NOT use "
        f"the filename as the problem title — identify the actual algorithmic problem from "
        f"the code logic.{_hint_block(hint)}\n\n```{language}\n{content}\n```"
    )
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
        max_tokens=6000,
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)
    return _with_defaults(result)


async def _gemini_analyze(client, content: str, filename: str, language: str, hint: str = "") -> dict:
    user_msg = (
        f"Analyze this {language} code file. The filename is '{filename}' but DO NOT use "
        f"the filename as the problem title — identify the actual algorithmic problem."
        f"{_hint_block(hint)}\n\n"
        f"```{language}\n{content}\n```"
    )
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=user_msg,
        config={
            "system_instruction": EXTRACTION_PROMPT,
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    )
    return _with_defaults(json.loads(response.text))


def _with_defaults(result: dict) -> dict:
    """Ensure every consumer-required key exists, even if the model omitted it."""
    result.setdefault("title", "Untitled Problem")
    result.setdefault("problem_statement", "")
    result.setdefault("difficulty", "Medium")
    result.setdefault("dsa_tags", [])
    result.setdefault("extracted_approaches", [])
    result.setdefault("deep_analysis", None)
    result.setdefault("generated_test_cases", [])
    return result
