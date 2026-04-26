"""
CodeVault Pydantic Schemas — Request/Response Validation
Strict schema layer between API and database.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ─── Enums (mirrored from ORM) ───────────────────────────────────
class DifficultyLevel(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"
    IMPOSSIBLE = "Impossible"


class SolutionType(str, Enum):
    ORIGINAL_UPLOAD = "original_upload"
    PRACTICE_SESSION = "practice_session"


class SupportedLanguage(str, Enum):
    CPP = "cpp"
    JAVA = "java"
    PYTHON = "python"
    SQL = "sql"


# ─── Extracted Approach (from Deep-Scan Engine) ──────────────────
class ExtractedApproach(BaseModel):
    """A single algorithmic approach parsed from a solution file."""
    approach_name: str = Field(..., examples=["Brute Force Recursion"])
    raw_code: str = Field(..., description="The uncommented, executable code for this approach")
    time_complexity: str = Field("", examples=["O(n^2)"])
    space_complexity: str = Field("", examples=["O(n)"])
    explanation: str = Field("", description="Brief explanation of this approach's strategy")


# ─── Deep Analysis ───────────────────────────────────────────────
class LineBreakdown(BaseModel):
    """Line-by-line code breakdown for a specific approach."""
    line_number: int
    code: str
    explanation: str


class ApproachAnalysis(BaseModel):
    """Full analysis for one approach within a solution."""
    approach_name: str
    summary: str
    time_complexity: str
    space_complexity: str
    line_breakdown: list[LineBreakdown] = []


class DeepAnalysis(BaseModel):
    """Overall AI-generated analysis for a solution file."""
    overall_summary: str = ""
    approaches: list[ApproachAnalysis] = []
    key_insights: list[str] = []
    common_mistakes: list[str] = []


# ─── Vault Problem Schemas ───────────────────────────────────────
class VaultProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    problem_statement: Optional[str] = None
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    dsa_tags: list[str] = Field(default_factory=list, examples=[["DP", "Array", "Stack"]])


class VaultProblemCreate(VaultProblemBase):
    """Schema for creating a new vault problem."""
    generated_test_cases: Optional[list[dict]] = None


class VaultProblemUpdate(BaseModel):
    """Schema for partially updating a vault problem (admin override)."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    problem_statement: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    dsa_tags: Optional[list[str]] = None
    generated_test_cases: Optional[list[dict]] = None


class VaultProblemResponse(VaultProblemBase):
    """Schema for vault problem API responses."""
    id: uuid.UUID
    generated_test_cases: Optional[list[dict]] = None
    created_at: datetime
    updated_at: datetime
    solution_count: int = 0

    model_config = {"from_attributes": True}


# ─── Problem Solution Schemas ────────────────────────────────────
class ProblemSolutionBase(BaseModel):
    language: SupportedLanguage = SupportedLanguage.CPP
    solution_type: SolutionType = SolutionType.ORIGINAL_UPLOAD


class ProblemSolutionCreate(ProblemSolutionBase):
    """Schema for creating a new solution entry."""
    s3_file_url: Optional[str] = None
    extracted_approaches: list[ExtractedApproach] = Field(default_factory=list)
    deep_analysis: Optional[DeepAnalysis] = None


class ProblemSolutionResponse(ProblemSolutionBase):
    """Schema for solution API responses."""
    id: uuid.UUID
    problem_id: uuid.UUID
    s3_file_url: Optional[str] = None
    extracted_approaches: list[ExtractedApproach] = []
    deep_analysis: Optional[DeepAnalysis] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Practice Attempt Schemas ────────────────────────────────────
class PracticeAttemptCreate(BaseModel):
    """Schema for starting a practice attempt."""
    problem_id: uuid.UUID


class PracticeAttemptComplete(BaseModel):
    """Schema for completing a practice attempt."""
    time_to_solve_seconds: int = Field(..., ge=0)
    execution_ms: Optional[float] = Field(None, ge=0)
    space_kb: Optional[float] = Field(None, ge=0)
    hints_used: int = Field(0, ge=0)
    is_optimal: bool = False
    passed: bool = False
    focus_lost_events: int = Field(0, ge=0)


class PracticeAttemptResponse(BaseModel):
    """Schema for practice attempt API responses."""
    id: uuid.UUID
    problem_id: uuid.UUID
    user_id: uuid.UUID
    started_at: datetime
    completed_at: Optional[datetime] = None
    time_to_solve_seconds: Optional[int] = None
    execution_ms: Optional[float] = None
    space_kb: Optional[float] = None
    hints_used: int = 0
    is_optimal: bool = False
    passed: bool = False
    focus_lost_events: int = 0

    model_config = {"from_attributes": True}


# ─── AI Ingestion Schemas ────────────────────────────────────────
class IngestionRequest(BaseModel):
    """Schema for the AI ingestion pipeline response from Gemini."""
    title: str
    problem_statement: str
    difficulty: DifficultyLevel
    dsa_tags: list[str]
    extracted_approaches: list[ExtractedApproach]
    generated_test_cases: list[dict] = []


class IngestionJobStatus(BaseModel):
    """Schema for tracking async ingestion job status."""
    job_id: str
    status: str = Field(..., examples=["pending", "processing", "completed", "failed"])
    total_files: int = 0
    processed_files: int = 0
    failed_files: int = 0
    errors: list[str] = []


# ─── Auth Schemas ─────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8)
    invitation_code: str


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Analytics Schemas ───────────────────────────────────────────
class ProficiencyStats(BaseModel):
    """Aggregated stats per DSA tag for the weakness heatmap."""
    dsa_tag: str
    total_attempts: int
    success_rate: float = Field(..., ge=0, le=1)
    average_solve_time_seconds: float
    days_since_last_success: int
    retention_score: float = Field(
        ..., ge=0, le=1, description="1.0 = strong retention, 0.0 = fully decayed"
    )


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    service: str = "CodeVault API"
    version: str = "0.1.0"
    environment: str = "development"
