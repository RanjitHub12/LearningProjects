"""
Upload Router — Single file and bulk upload endpoints.
Phase 2: AI-powered ingestion pipeline with deep-scan extraction.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import VaultProblem, ProblemSolution, SupportedLanguage, SolutionType, DifficultyLevel
from services.gemini_service import analyze_code_file
from routers.execution import execute_code, ExecutionRequest

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])


class SingleFileUpload(BaseModel):
    filename: str
    content: str
    language: str = "cpp"


class ApproachSummary(BaseModel):
    approach_name: str
    time_complexity: str = ""
    space_complexity: str = ""


class UploadResponse(BaseModel):
    problem_id: str
    title: str
    difficulty: str
    dsa_tags: list[str]
    approaches_found: int
    approach_names: list[str]
    has_deep_analysis: bool
    problem_statement: str = ""
    message: str


@router.post("/single", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_single_file(
    payload: SingleFileUpload,
    db: AsyncSession = Depends(get_db),
):
    """Upload and analyze a single code file through the AI engine."""

    # Run AI analysis (Groq → Gemini → heuristic fallback)
    analysis = await analyze_code_file(
        content=payload.content,
        filename=payload.filename,
        language=payload.language,
    )

    # Map difficulty string to enum
    diff_map = {
        'Easy': DifficultyLevel.EASY,
        'Medium': DifficultyLevel.MEDIUM,
        'Hard': DifficultyLevel.HARD,
        'Impossible': DifficultyLevel.IMPOSSIBLE,
    }
    difficulty = diff_map.get(analysis.get('difficulty', 'Medium'), DifficultyLevel.MEDIUM)

    # Map language string to enum
    lang_map = {
        'cpp': SupportedLanguage.CPP,
        'java': SupportedLanguage.JAVA,
        'python': SupportedLanguage.PYTHON,
        'sql': SupportedLanguage.SQL,
    }
    lang_enum = lang_map.get(payload.language, SupportedLanguage.CPP)

    extracted = analysis.get('extracted_approaches', [])
    deep = analysis.get('deep_analysis', None)
    approach_names = [a.get('approach_name', f'Approach {i+1}') for i, a in enumerate(extracted)]

    # Check for duplicate by title (basic dedup)
    existing = await db.execute(
        select(VaultProblem).where(VaultProblem.title == analysis.get('title', ''))
    )
    existing_problem = existing.scalar_one_or_none()

    if existing_problem:
        # Append as a new solution to existing problem
        solution = ProblemSolution(
            problem_id=existing_problem.id,
            language=lang_enum,
            solution_type=SolutionType.ORIGINAL_UPLOAD,
            extracted_approaches=extracted,
            deep_analysis=deep,
        )
        db.add(solution)
        await db.flush()

        return UploadResponse(
            problem_id=str(existing_problem.id),
            title=existing_problem.title,
            difficulty=existing_problem.difficulty.value,
            dsa_tags=existing_problem.dsa_tags or [],
            approaches_found=len(extracted),
            approach_names=approach_names,
            has_deep_analysis=deep is not None,
            problem_statement=existing_problem.problem_statement or "",
            message="Added as new solution to existing problem",
        )

    # Create new problem
    problem = VaultProblem(
        title=analysis.get('title', payload.filename),
        problem_statement=analysis.get('problem_statement', ''),
        difficulty=difficulty,
        dsa_tags=analysis.get('dsa_tags', []),
        generated_test_cases=analysis.get('generated_test_cases', []),
    )
    db.add(problem)
    await db.flush()
    await db.refresh(problem)

    # Create solution linked to problem
    solution = ProblemSolution(
        problem_id=problem.id,
        language=lang_enum,
        solution_type=SolutionType.ORIGINAL_UPLOAD,
        extracted_approaches=extracted,
        deep_analysis=deep,
    )
    db.add(solution)
    await db.flush()

    return UploadResponse(
        problem_id=str(problem.id),
        title=problem.title,
        difficulty=problem.difficulty.value,
        dsa_tags=problem.dsa_tags or [],
        approaches_found=len(extracted),
        approach_names=approach_names,
        has_deep_analysis=deep is not None,
        problem_statement=problem.problem_statement or "",
        message="Problem created and solution stored successfully",
    )


# ─── Save from Workspace (Editor) ───────────────────────────────
class WorkspaceSaveRequest(BaseModel):
    code: str
    language: str = "cpp"


class TestRunResult(BaseModel):
    input: str
    expected_output: str
    actual_output: str = ""
    passed: bool = False
    error: str = ""


class WorkspaceSaveResponse(BaseModel):
    status: str  # "saved" | "tests_failed" | "duplicate" | "no_tests" | "analysis_failed"
    message: str
    title: str = ""
    difficulty: str = ""
    dsa_tags: list[str] = []
    problem_statement: str = ""
    approaches_found: int = 0
    approach_names: list[str] = []
    test_results: list[TestRunResult] = []
    tests_passed: int = 0
    tests_total: int = 0
    problem_id: str = ""
    duplicate_of_id: str = ""
    duplicate_of_title: str = ""


def _norm_output(s: str) -> str:
    """Normalize output for tolerant comparison: trim trailing whitespace per line."""
    return "\n".join(line.rstrip() for line in (s or "").strip().splitlines()).strip()


# ─── Analyze-only (no DB persist) ──────────────────────────────
class AnalyzeRequest(BaseModel):
    code: str
    language: str = "cpp"
    filename: str = ""


class AnalyzeResponse(BaseModel):
    title: str = ""
    problem_statement: str = ""
    difficulty: str = ""
    dsa_tags: list[str] = []
    generated_test_cases: list[dict] = []
    extracted_approaches: list[dict] = []
    deep_analysis: dict | None = None
    error: str = ""


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_only(payload: AnalyzeRequest):
    """
    Run AI analysis on code without saving to the vault.
    Used by the Folders page when the user creates a new code file —
    we want the description / test cases / tags returned to localStorage,
    not persisted as a VaultProblem.
    """
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


@router.post("/save-from-workspace", response_model=WorkspaceSaveResponse)
async def save_from_workspace(
    payload: WorkspaceSaveRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Workspace save pipeline:
      1. AI analysis (title, statement, tags, test cases, deep analysis with comments)
      2. Run code against generated test cases (stdin/stdout)
      3. Reject if any test fails
      4. Reject if a problem with the same title already exists (duplicate)
      5. Otherwise create VaultProblem + ProblemSolution
    """

    # ── 1. Analyze ─────────────────────────────────────────────
    try:
        analysis = await analyze_code_file(
            content=payload.code,
            filename=f"workspace.{payload.language}",
            language=payload.language,
        )
    except Exception as e:
        return WorkspaceSaveResponse(
            status="analysis_failed",
            message=f"AI analysis failed: {e}",
        )

    title = (analysis.get("title") or "").strip()
    test_cases = analysis.get("generated_test_cases") or []
    extracted = analysis.get("extracted_approaches") or []
    deep = analysis.get("deep_analysis")
    approach_names = [a.get("approach_name", f"Approach {i+1}") for i, a in enumerate(extracted)]

    if not title:
        return WorkspaceSaveResponse(
            status="analysis_failed",
            message="AI could not infer a problem title from the code.",
        )

    # ── 2. Require at least one test case ──────────────────────
    if not test_cases:
        return WorkspaceSaveResponse(
            status="no_tests",
            message="AI could not generate test cases for this code. Try adding more context or comments.",
            title=title,
            problem_statement=analysis.get("problem_statement", ""),
        )

    # ── 3. Run each test case through the sandbox ──────────────
    test_results: list[TestRunResult] = []
    passed_count = 0
    for tc in test_cases:
        tc_input = str(tc.get("input", ""))
        tc_expected = str(tc.get("expected_output", ""))
        try:
            exec_resp = await execute_code(
                ExecutionRequest(code=payload.code, language=payload.language, stdin=tc_input)
            )
        except Exception as e:
            test_results.append(TestRunResult(
                input=tc_input, expected_output=tc_expected,
                actual_output="", passed=False, error=f"Execution error: {e}",
            ))
            continue

        if exec_resp.error:
            test_results.append(TestRunResult(
                input=tc_input, expected_output=tc_expected,
                actual_output=exec_resp.stdout or "", passed=False, error=exec_resp.error,
            ))
            continue

        actual = exec_resp.stdout or ""
        ok = _norm_output(actual) == _norm_output(tc_expected)
        if ok:
            passed_count += 1
        test_results.append(TestRunResult(
            input=tc_input,
            expected_output=tc_expected,
            actual_output=actual,
            passed=ok,
            error=exec_resp.stderr if not ok else "",
        ))

    if passed_count < len(test_cases):
        return WorkspaceSaveResponse(
            status="tests_failed",
            message=f"Code passed {passed_count}/{len(test_cases)} test cases. Fix failures before saving.",
            title=title,
            problem_statement=analysis.get("problem_statement", ""),
            dsa_tags=analysis.get("dsa_tags", []),
            test_results=test_results,
            tests_passed=passed_count,
            tests_total=len(test_cases),
        )

    # ── 4. Duplicate check (case-insensitive title match) ──────
    existing = await db.execute(
        select(VaultProblem).where(func.lower(VaultProblem.title) == title.lower())
    )
    existing_problem = existing.scalar_one_or_none()
    if existing_problem:
        return WorkspaceSaveResponse(
            status="duplicate",
            message=f"A problem titled '{existing_problem.title}' already exists in the vault.",
            title=title,
            test_results=test_results,
            tests_passed=passed_count,
            tests_total=len(test_cases),
            duplicate_of_id=str(existing_problem.id),
            duplicate_of_title=existing_problem.title,
        )

    # ── 5. Save ────────────────────────────────────────────────
    diff_map = {
        "Easy": DifficultyLevel.EASY, "Medium": DifficultyLevel.MEDIUM,
        "Hard": DifficultyLevel.HARD, "Impossible": DifficultyLevel.IMPOSSIBLE,
    }
    lang_map = {
        "cpp": SupportedLanguage.CPP, "java": SupportedLanguage.JAVA,
        "python": SupportedLanguage.PYTHON, "sql": SupportedLanguage.SQL,
    }

    problem = VaultProblem(
        title=title,
        problem_statement=analysis.get("problem_statement", ""),
        difficulty=diff_map.get(analysis.get("difficulty", "Medium"), DifficultyLevel.MEDIUM),
        dsa_tags=analysis.get("dsa_tags", []),
        generated_test_cases=test_cases,
    )
    db.add(problem)
    await db.flush()
    await db.refresh(problem)

    solution = ProblemSolution(
        problem_id=problem.id,
        language=lang_map.get(payload.language, SupportedLanguage.CPP),
        solution_type=SolutionType.ORIGINAL_UPLOAD,
        extracted_approaches=extracted,
        deep_analysis=deep,
    )
    db.add(solution)
    await db.flush()

    return WorkspaceSaveResponse(
        status="saved",
        message=f"Saved to vault! All {passed_count}/{len(test_cases)} tests passed.",
        title=problem.title,
        difficulty=problem.difficulty.value,
        dsa_tags=problem.dsa_tags or [],
        problem_statement=problem.problem_statement or "",
        approaches_found=len(extracted),
        approach_names=approach_names,
        test_results=test_results,
        tests_passed=passed_count,
        tests_total=len(test_cases),
        problem_id=str(problem.id),
    )
