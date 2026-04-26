"""
Problems Router — CRUD endpoints for vault problems (stub).
Full implementation in Phase 2.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import VaultProblem, DifficultyLevel
from schemas import (
    VaultProblemCreate,
    VaultProblemResponse,
    VaultProblemUpdate,
)

router = APIRouter(prefix="/api/v1/problems", tags=["Problems"])


@router.get("/", response_model=list[VaultProblemResponse])
async def list_problems(
    difficulty: Optional[DifficultyLevel] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all vault problems with optional filters."""
    query = select(VaultProblem)

    if difficulty:
        query = query.where(VaultProblem.difficulty == difficulty)

    if tag:
        # JSONB containment: dsa_tags @> '["Stack"]'
        query = query.where(VaultProblem.dsa_tags.contains([tag]))

    if search:
        query = query.where(VaultProblem.title.ilike(f"%{search}%"))

    query = query.order_by(VaultProblem.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    problems = result.scalars().all()
    return problems


@router.get("/{problem_id}", response_model=VaultProblemResponse)
async def get_problem(
    problem_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single vault problem by ID."""
    result = await db.execute(
        select(VaultProblem).where(VaultProblem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Problem {problem_id} not found",
        )
    return problem


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


@router.patch("/{problem_id}", response_model=VaultProblemResponse)
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
    return problem


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
