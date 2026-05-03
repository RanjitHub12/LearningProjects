"""POST /analyze — AI analysis only (no DB write).

Used by the Folders page when the user creates a new code file: we want the
description / test cases / tags returned to localStorage, NOT persisted as a
VaultProblem.
"""

from fastapi import APIRouter

from services.ai import analyze_code_file

from .schemas import AnalyzeRequest, AnalyzeResponse

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_only(payload: AnalyzeRequest):
    if not payload.code.strip():
        return AnalyzeResponse(error="Empty code")
    try:
        analysis = await analyze_code_file(
            content=payload.code,
            filename=payload.filename or f"snippet.{payload.language}",
            language=payload.language,
        )
    except Exception as e:
        return AnalyzeResponse(error=f"AI analysis failed: {e}")

    return AnalyzeResponse(
        title=analysis.get("title", "") or "",
        problem_statement=analysis.get("problem_statement", "") or "",
        difficulty=analysis.get("difficulty", "") or "",
        dsa_tags=analysis.get("dsa_tags", []) or [],
        generated_test_cases=analysis.get("generated_test_cases", []) or [],
        extracted_approaches=analysis.get("extracted_approaches", []) or [],
        deep_analysis=analysis.get("deep_analysis"),
    )
