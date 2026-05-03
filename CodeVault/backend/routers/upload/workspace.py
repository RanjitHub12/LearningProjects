"""POST /save-from-workspace — analyze + auto-wrap + run tests + dedup + persist.

Pipeline:
  1. AI analysis (title, statement, tags, test cases, deep analysis).
  2. If the user's code lacks an entry-point, ask AI to wrap it with a main
     that reads stdin per the generated test cases.
  3. Run wrapped code against every test case in the sandbox.
  4. Reject if any test fails or a problem with the same title already exists.
  5. Otherwise create VaultProblem + ProblemSolution.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import VaultProblem, ProblemSolution, SolutionType, DifficultyLevel, SupportedLanguage
from services.ai import analyze_code_file, generate_runner, has_main
from routers.execution import execute_code, ExecutionRequest

from .schemas import WorkspaceSaveRequest, WorkspaceSaveResponse, TestRunResult
from ._helpers import DIFFICULTY_MAP, LANGUAGE_MAP, normalize_output

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

    # ── 1. Analyze ─────────────────────────────────────────────
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
    # Prefer LC/vault sample test cases over AI-generated ones — they are
    # ground truth from leetcode.com or a previously saved problem.
    test_cases = payload.context_test_cases or analysis.get("generated_test_cases") or []
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

    # ── 2b. If the user's code has no main, ask AI to wrap it ──
    runnable_code = payload.code
    runner_added = False
    if not has_main(payload.code, payload.language):
        wrapped = await generate_runner(payload.code, payload.language, test_cases)
        if wrapped:
            runnable_code = wrapped
            runner_added = True

    # ── 3. Run each test case through the sandbox ──────────────
    test_results: list[TestRunResult] = []
    passed_count = 0
    for tc in test_cases:
        tc_input = str(tc.get("input", ""))
        tc_expected = str(tc.get("expected_output", ""))
        try:
            exec_resp = await execute_code(
                ExecutionRequest(code=runnable_code, language=payload.language, stdin=tc_input)
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
        ok = normalize_output(actual) == normalize_output(tc_expected)
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
            executable_code=runnable_code if runner_added else "",
            runner_added=runner_added,
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
        executable_code=runnable_code if runner_added else "",
        runner_added=runner_added,
    )
