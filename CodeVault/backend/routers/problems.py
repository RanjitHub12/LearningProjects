"""
Problems Router — CRUD endpoints for vault problems + solutions.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import VaultProblem, ProblemSolution, DifficultyLevel
from schemas import (
    VaultProblemCreate,
    VaultProblemResponse,
    VaultProblemUpdate,
)

router = APIRouter(prefix="/api/v1/problems", tags=["Problems"])


# ─── List Problems ──────────────────────────────────────────────
@router.get("/")
async def list_problems(
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all vault problems with optional filters."""
    query = select(VaultProblem).options(selectinload(VaultProblem.solutions))

    if difficulty:
        diff_map = {
            'Easy': DifficultyLevel.EASY,
            'Medium': DifficultyLevel.MEDIUM,
            'Hard': DifficultyLevel.HARD,
            'Impossible': DifficultyLevel.IMPOSSIBLE,
        }
        if difficulty in diff_map:
            query = query.where(VaultProblem.difficulty == diff_map[difficulty])

    if tag:
        query = query.where(VaultProblem.dsa_tags.contains([tag]))

    if search:
        query = query.where(VaultProblem.title.ilike(f"%{search}%"))

    query = query.order_by(VaultProblem.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    problems = result.scalars().unique().all()

    return [
        {
            "id": str(p.id),
            "title": p.title,
            "problem_statement": p.problem_statement,
            "difficulty": p.difficulty.value if p.difficulty else "Medium",
            "dsa_tags": p.dsa_tags or [],
            "generated_test_cases": p.generated_test_cases or [],
            "solution_count": len(p.solutions) if p.solutions else 0,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in problems
    ]


# ─── Get Single Problem ────────────────────────────────────────
@router.get("/{problem_id}")
async def get_problem(
    problem_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single vault problem by ID, including solutions."""
    result = await db.execute(
        select(VaultProblem)
        .options(selectinload(VaultProblem.solutions))
        .where(VaultProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem {problem_id} not found",
        )

    solutions_data = []
    for s in (problem.solutions or []):
        solutions_data.append({
            "id": str(s.id),
            "problem_id": str(s.problem_id),
            "language": s.language.value if s.language else "cpp",
            "solution_type": s.solution_type.value if s.solution_type else "original_upload",
            "extracted_approaches": s.extracted_approaches or [],
            "deep_analysis": s.deep_analysis,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return {
        "id": str(problem.id),
        "title": problem.title,
        "problem_statement": problem.problem_statement,
        "difficulty": problem.difficulty.value if problem.difficulty else "Medium",
        "dsa_tags": problem.dsa_tags or [],
        "generated_test_cases": problem.generated_test_cases or [],
        "solution_count": len(problem.solutions) if problem.solutions else 0,
        "solutions": solutions_data,
        "created_at": problem.created_at.isoformat() if problem.created_at else None,
        "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
    }


# ─── Get Solutions for a Problem ────────────────────────────────
@router.get("/{problem_id}/solutions")
async def get_problem_solutions(
    problem_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all solutions for a problem with extracted approaches."""
    result = await db.execute(
        select(ProblemSolution)
        .where(ProblemSolution.problem_id == problem_id)
        .order_by(ProblemSolution.created_at.desc())
    )
    solutions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "problem_id": str(s.problem_id),
            "language": s.language.value if s.language else "cpp",
            "solution_type": s.solution_type.value if s.solution_type else "original_upload",
            "extracted_approaches": s.extracted_approaches or [],
            "deep_analysis": s.deep_analysis,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in solutions
    ]


# ─── Create Problem ────────────────────────────────────────────
@router.post("/", response_model=VaultProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    payload: VaultProblemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new vault problem (used by AI ingestion or admin)."""
    problem = VaultProblem(
        title=payload.title,
        problem_statement=payload.problem_statement,
        difficulty=payload.difficulty,
        dsa_tags=payload.dsa_tags,
        generated_test_cases=payload.generated_test_cases,
    )
    db.add(problem)
    await db.flush()
    await db.refresh(problem)
    return problem


# ─── Update Problem ────────────────────────────────────────────
@router.patch("/{problem_id}")
async def update_problem(
    problem_id: UUID,
    payload: VaultProblemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a vault problem (admin override)."""
    result = await db.execute(
        select(VaultProblem).where(VaultProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem {problem_id} not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(problem, field, value)

    await db.flush()
    await db.refresh(problem)

    return {
        "id": str(problem.id),
        "title": problem.title,
        "problem_statement": problem.problem_statement,
        "difficulty": problem.difficulty.value if problem.difficulty else "Medium",
        "dsa_tags": problem.dsa_tags or [],
        "generated_test_cases": problem.generated_test_cases or [],
        "solution_count": 0,
        "created_at": problem.created_at.isoformat() if problem.created_at else None,
        "updated_at": problem.updated_at.isoformat() if problem.updated_at else None,
    }


# ─── Delete Problem ────────────────────────────────────────────
@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a vault problem and cascade to solutions/attempts."""
    result = await db.execute(
        select(VaultProblem).where(VaultProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem {problem_id} not found",
        )
    await db.delete(problem)
