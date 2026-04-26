"""
Upload Router — Single file and bulk upload endpoints.
Phase 2: AI-powered ingestion pipeline.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import VaultProblem, ProblemSolution, SupportedLanguage, SolutionType, DifficultyLevel
from services.gemini_service import analyze_code_file

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])


class SingleFileUpload(BaseModel):
    filename: str
    content: str
    language: str = "cpp"


class UploadResponse(BaseModel):
    problem_id: str
    title: str
    difficulty: str
    dsa_tags: list[str]
    approaches_found: int
    message: str


@router.post("/single", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_single_file(
    payload: SingleFileUpload,
    db: AsyncSession = Depends(get_db),
):
    """Upload and analyze a single code file through the AI engine."""

    # Run AI analysis (Gemini or heuristic fallback)
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
            extracted_approaches=analysis.get('extracted_approaches', []),
            deep_analysis=None,
        )
        db.add(solution)
        await db.flush()

        return UploadResponse(
            problem_id=str(existing_problem.id),
            title=existing_problem.title,
            difficulty=existing_problem.difficulty.value,
            dsa_tags=existing_problem.dsa_tags or [],
            approaches_found=len(analysis.get('extracted_approaches', [])),
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
        extracted_approaches=analysis.get('extracted_approaches', []),
        deep_analysis=None,
    )
    db.add(solution)
    await db.flush()

    return UploadResponse(
        problem_id=str(problem.id),
        title=problem.title,
        difficulty=problem.difficulty.value,
        dsa_tags=problem.dsa_tags or [],
        approaches_found=len(analysis.get('extracted_approaches', [])),
        message="Problem created and solution stored",
    )
