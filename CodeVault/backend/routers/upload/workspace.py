"""POST /save-from-workspace — analyze + dedup + persist.

Pipeline:
  1. AI analysis (title, statement, tags, deep analysis).
  2. Reject if a problem with the same title already exists.
  3. Otherwise create VaultProblem + ProblemSolution.

Test-case generation/running was removed: AI-generated tests frequently
mismatched the user's stdout format and blocked otherwise-correct saves.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import VaultProblem, ProblemSolution, SolutionType, DifficultyLevel, SupportedLanguage
from services.ai import analyze_code_file

from .schemas import WorkspaceSaveRequest, WorkspaceSaveResponse
from ._helpers import DIFFICULTY_MAP, LANGUAGE_MAP

router = APIRouter()


@router.post("/save-from-workspace", response_model=WorkspaceSaveResponse)
async def save_from_workspace(
    payload: WorkspaceSaveRequest,
    db: AsyncSession = Depends(get_db),
):
    # ── 0. Build a context block from any loaded LeetCode/vault problem ─
    # When the workspace already shows problem metadata we fold it into the
    # AI prompt as authoritative context so the analyzer doesn't have to
    # re-derive everything from a bare function. Combined with any explicit
    # user hint, this dramatically improves results for LeetCode flows.
    auto_context_parts: list[str] = []
    if payload.context_title:
        auto_context_parts.append(f"Problem title: {payload.context_title}")
    if payload.context_difficulty:
        auto_context_parts.append(f"Difficulty: {payload.context_difficulty}")
    if payload.context_tags:
        auto_context_parts.append("Tags: " + ", ".join(payload.context_tags))
    if payload.context_statement:
        # Trim very long statements so the prompt stays inside the model
        # context window (LC HTML-stripped content can be huge).
        stmt = payload.context_statement.strip()
        if len(stmt) > 3500:
            stmt = stmt[:3500] + "…"
        auto_context_parts.append(f"Problem statement:\n{stmt}")
    if payload.context_test_cases:
        sample_lines = []
        for i, tc in enumerate(payload.context_test_cases[:4], 1):
            sample_lines.append(
                f"Example {i}:\n  Input: {tc.get('input','')}\n  "
                f"Expected output: {tc.get('expected_output','')}"
            )
        auto_context_parts.append("Sample test cases:\n" + "\n".join(sample_lines))
    auto_context = "\n\n".join(auto_context_parts)
    combined_hint = (payload.hint or "")
    if auto_context:
        combined_hint = (auto_context + ("\n\nUser hint: " + payload.hint if payload.hint else "")).strip()

    # ── 1. Analyze (or skip when the user filled the form manually) ─────
    if payload.manual:
        # Manual entry: trust the form values verbatim, no AI call. Title is
        # required because nothing else can supply it.
        if not (payload.context_title or "").strip():
            return WorkspaceSaveResponse(
                status="analysis_failed",
                message="Title is required when saving manually.",
                engine="manual",
            )
        analysis = {
            "title": payload.context_title.strip(),
            "problem_statement": payload.context_statement or "",
            "difficulty": payload.context_difficulty or "Medium",
            "dsa_tags": payload.context_tags or [],
            "extracted_approaches": [],
            "deep_analysis": None,
            "_engine": "manual",
        }
    else:
        try:
            analysis = await analyze_code_file(
                content=payload.code,
                filename=f"workspace.{payload.language}",
                language=payload.language,
                hint=combined_hint,
            )
        except Exception as e:
            return WorkspaceSaveResponse(
                status="analysis_failed",
                message=f"AI analysis failed: {e}",
            )

        # If the workspace passed in a title we trust it over the AI's guess —
        # the user explicitly chose this problem, the AI shouldn't rename it.
        if payload.context_title:
            analysis["title"] = payload.context_title
        if payload.context_statement and not (analysis.get("problem_statement") or "").strip():
            analysis["problem_statement"] = payload.context_statement
        if payload.context_difficulty and not (analysis.get("difficulty") or "").strip():
            analysis["difficulty"] = payload.context_difficulty
        if payload.context_tags and not analysis.get("dsa_tags"):
            analysis["dsa_tags"] = payload.context_tags

    title = (analysis.get("title") or "").strip()
    # We still keep LC/vault sample test cases when present so the saved
    # problem retains them for the stdin "Load sample" feature, but we no
    # longer run anything against them and the AI's own generated tests are
    # ignored on this path.
    test_cases = payload.context_test_cases or []
    extracted = analysis.get("extracted_approaches") or []
    deep = analysis.get("deep_analysis")
    approach_names = [a.get("approach_name", f"Approach {i+1}") for i, a in enumerate(extracted)]

    if not title:
        return WorkspaceSaveResponse(
            status="analysis_failed",
            message="AI could not infer a problem title from the code.",
        )

    # ── 2. Duplicate check (case-insensitive title match) ──────
    existing = await db.execute(
        select(VaultProblem).where(func.lower(VaultProblem.title) == title.lower())
    )
    existing_problem = existing.scalar_one_or_none()
    if existing_problem:
        return WorkspaceSaveResponse(
            status="duplicate",
            message=f"A problem titled '{existing_problem.title}' already exists in the vault.",
            title=title,
            engine=analysis.get("_engine", ""),
            duplicate_of_id=str(existing_problem.id),
            duplicate_of_title=existing_problem.title,
        )

    # ── 3. Save ────────────────────────────────────────────────
    problem = VaultProblem(
        title=title,
        problem_statement=analysis.get("problem_statement", ""),
        difficulty=DIFFICULTY_MAP.get(analysis.get("difficulty", "Medium"), DifficultyLevel.MEDIUM),
        dsa_tags=analysis.get("dsa_tags", []),
        generated_test_cases=test_cases,
    )
    db.add(problem)
    await db.flush()
    await db.refresh(problem)

    solution = ProblemSolution(
        problem_id=problem.id,
        language=LANGUAGE_MAP.get(payload.language, SupportedLanguage.CPP),
        solution_type=SolutionType.ORIGINAL_UPLOAD,
        extracted_approaches=extracted,
        deep_analysis=deep,
    )
    db.add(solution)
    await db.flush()

    return WorkspaceSaveResponse(
        status="saved",
        message="Saved to vault!",
        title=problem.title,
        difficulty=problem.difficulty.value,
        dsa_tags=problem.dsa_tags or [],
        problem_statement=problem.problem_statement or "",
        approaches_found=len(extracted),
        approach_names=approach_names,
        problem_id=str(problem.id),
        engine=analysis.get("_engine", ""),
    )
