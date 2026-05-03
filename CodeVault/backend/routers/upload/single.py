"""POST /single — bulk upload pipeline (analyze + persist a vault problem)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import VaultProblem, ProblemSolution, SolutionType, DifficultyLevel, SupportedLanguage
from services.ai import analyze_code_file

from .schemas import SingleFileUpload, UploadResponse
from ._helpers import DIFFICULTY_MAP, LANGUAGE_MAP

router = APIRouter()


@router.post("/single", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_single_file(
    payload: SingleFileUpload,
    db: AsyncSession = Depends(get_db),
):
    """Upload and analyze a single code file through the AI engine."""

    analysis = await analyze_code_file(
        content=payload.content,
        filename=payload.filename,
        language=payload.language,
    )

    difficulty = DIFFICULTY_MAP.get(analysis.get("difficulty", "Medium"), DifficultyLevel.MEDIUM)
    lang_enum = LANGUAGE_MAP.get(payload.language, SupportedLanguage.CPP)

    extracted = analysis.get("extracted_approaches", [])
    deep = analysis.get("deep_analysis", None)
    approach_names = [a.get("approach_name", f"Approach {i+1}") for i, a in enumerate(extracted)]
    engine = analysis.get("_engine", "")

    # Dedup by exact title match — if the same problem already exists, append
    # this upload as another solution rather than creating a duplicate problem.
    existing = await db.execute(
        select(VaultProblem).where(VaultProblem.title == analysis.get("title", ""))
    )
    existing_problem = existing.scalar_one_or_none()

    if existing_problem:
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
            engine=engine,
        )

    problem = VaultProblem(
        title=analysis.get("title", payload.filename),
        problem_statement=analysis.get("problem_statement", ""),
        difficulty=difficulty,
        dsa_tags=analysis.get("dsa_tags", []),
        generated_test_cases=analysis.get("generated_test_cases", []),
    )
    db.add(problem)
    await db.flush()
    await db.refresh(problem)

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
        engine=engine,
    )
