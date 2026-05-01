"""
LeetCode integration — proxy the public daily challenge GraphQL endpoint.

The browser cannot call leetcode.com/graphql directly because of CORS, so the
backend acts as a thin pass-through. We do NOT attempt to update the user's
LeetCode submission streak from the server: that would require their session
cookie and impersonating their browser, which is fragile and against ToS.
The frontend exposes a "Submit on LeetCode" handoff button instead.
"""

from __future__ import annotations

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
    }
  }
}
""".strip()


class DailyResponse(BaseModel):
    date: str
    title: str
    titleSlug: str
    questionFrontendId: str
    difficulty: str
    link: str
    content: str  # HTML
    tags: list[str]


@router.get("/daily", response_model=DailyResponse)
async def daily_challenge():
    """Fetch today's LeetCode daily coding challenge."""
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
        return DailyResponse(
            date=data.get("date", ""),
            title=q.get("title", ""),
            titleSlug=slug,
            questionFrontendId=q.get("questionFrontendId", ""),
            difficulty=q.get("difficulty", ""),
            link=f"https://leetcode.com/problems/{slug}/" if slug else data.get("link", ""),
            content=q.get("content", "") or "",
            tags=[t.get("name", "") for t in (q.get("topicTags") or []) if t.get("name")],
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Network error contacting LeetCode: {e}")
