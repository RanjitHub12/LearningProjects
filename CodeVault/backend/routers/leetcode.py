"""
LeetCode integration — proxy the public daily challenge GraphQL endpoint.

The browser cannot call leetcode.com/graphql directly because of CORS, so the
backend acts as a thin pass-through. We do NOT attempt to update the user's
LeetCode submission streak from the server: that would require their session
cookie and impersonating their browser, which is fragile and against ToS.
The frontend exposes a "Submit on LeetCode" handoff button instead.
"""

from __future__ import annotations

import re
from html import unescape

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/leetcode", tags=["LeetCode"])

LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

DAILY_QUERY = """
query questionOfToday {
  activeDailyCodingChallengeQuestion {
    date
    link
    question {
      titleSlug
      title
      difficulty
      content
      topicTags { name slug }
      questionFrontendId
      codeSnippets { lang langSlug code }
      exampleTestcases
    }
  }
}
""".strip()


class TestCase(BaseModel):
    input: str
    expected_output: str
    explanation: str = ""


class CodeSnippet(BaseModel):
    lang: str          # e.g. "C++"
    langSlug: str      # e.g. "cpp"
    code: str


class DailyResponse(BaseModel):
    date: str
    title: str
    titleSlug: str
    questionFrontendId: str
    difficulty: str
    link: str
    content: str  # raw HTML
    plainContent: str  # HTML-stripped problem statement
    tags: list[str]
    snippets: dict[str, str]  # langSlug -> boilerplate code (cpp/python/java)
    testCases: list[TestCase]


# LeetCode's `exampleTestcases` is newline-separated raw stdin only — it
# does not include expected outputs. We extract Input/Output/Explanation
# triples by parsing the rendered HTML, which is the source-of-truth shown
# to humans on leetcode.com.
_EX_BLOCK_RE = re.compile(
    r"<strong[^>]*>\s*Input\s*:?\s*</strong>\s*(?P<input>.+?)"
    r"<strong[^>]*>\s*Output\s*:?\s*</strong>\s*(?P<output>.+?)"
    r"(?:<strong[^>]*>\s*Explanation\s*:?\s*</strong>\s*(?P<expl>.+?))?"
    r"(?=<(?:strong|p|pre|li|h\d|/pre)|$)",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")


def _strip_tags(html: str) -> str:
    return unescape(_TAG_RE.sub("", html or "")).strip()


def _parse_examples(content_html: str) -> list[TestCase]:
    if not content_html:
        return []
    out: list[TestCase] = []
    for m in _EX_BLOCK_RE.finditer(content_html):
        inp = _strip_tags(m.group("input")).strip().rstrip(",.")
        outp = _strip_tags(m.group("output")).strip().rstrip(",.")
        expl = _strip_tags(m.group("expl") or "").strip()
        if inp or outp:
            out.append(TestCase(input=inp, expected_output=outp, explanation=expl))
    return out


# Map LeetCode's snippet langSlug values onto the three execution languages
# CodeVault supports today. Anything else is dropped.
_SNIPPET_LANG_MAP = {
    "cpp": "cpp",
    "python3": "python",
    "python": "python",
    "java": "java",
}


def _pick_snippets(snips: list[dict]) -> dict[str, str]:
    out: dict[str, str] = {}
    for s in snips or []:
        slug = (s.get("langSlug") or "").lower()
        target = _SNIPPET_LANG_MAP.get(slug)
        if target and target not in out:
            out[target] = s.get("code") or ""
    return out


@router.get("/daily", response_model=DailyResponse)
async def daily_challenge():
    """Fetch today's LeetCode daily coding challenge with boilerplate + parsed examples."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                LEETCODE_GRAPHQL,
                json={"query": DAILY_QUERY, "operationName": "questionOfToday"},
                headers={
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com/",
                    "User-Agent": "Mozilla/5.0 CodeVault/0.2",
                },
            )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"LeetCode returned {r.status_code}")
        data = r.json().get("data", {}).get("activeDailyCodingChallengeQuestion")
        if not data:
            raise HTTPException(status_code=502, detail="LeetCode returned no daily challenge")
        q = data.get("question") or {}
        slug = q.get("titleSlug", "")
        content_html = q.get("content", "") or ""
        return DailyResponse(
            date=data.get("date", ""),
            title=q.get("title", ""),
            titleSlug=slug,
            questionFrontendId=q.get("questionFrontendId", ""),
            difficulty=q.get("difficulty", ""),
            link=f"https://leetcode.com/problems/{slug}/" if slug else data.get("link", ""),
            content=content_html,
            plainContent=_strip_tags(content_html),
            tags=[t.get("name", "") for t in (q.get("topicTags") or []) if t.get("name")],
            snippets=_pick_snippets(q.get("codeSnippets") or []),
            testCases=_parse_examples(content_html),
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Network error contacting LeetCode: {e}")
