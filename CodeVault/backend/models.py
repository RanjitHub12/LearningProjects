"""
CodeVault ORM Models — SQLAlchemy Declarative Models
Maps to the blueprint database schema.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from database import Base


# ─── Enums ────────────────────────────────────────────────────────
class DifficultyLevel(str, enum.Enum):
    """Problem difficulty tiers."""
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"
    IMPOSSIBLE = "Impossible"


class SolutionType(str, enum.Enum):
    """How the solution was created."""
    ORIGINAL_UPLOAD = "original_upload"
    PRACTICE_SESSION = "practice_session"


class SupportedLanguage(str, enum.Enum):
    """Supported programming languages."""
    CPP = "cpp"
    JAVA = "java"
    PYTHON = "python"
    SQL = "sql"


# ─── Users ────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    practice_attempts = relationship("PracticeAttempt", back_populates="user")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(64), unique=True, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    used_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)


# ─── Vault Problems ──────────────────────────────────────────────
class VaultProblem(Base):
    __tablename__ = "vault_problems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False, index=True)
    problem_statement = Column(Text, nullable=True)
    difficulty = Column(
        Enum(DifficultyLevel, name="difficulty_level"),
        nullable=False,
        default=DifficultyLevel.MEDIUM,
    )
    dsa_tags = Column(JSONB, nullable=False, default=list)
    generated_test_cases = Column(JSONB, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    solutions = relationship(
        "ProblemSolution", back_populates="problem", cascade="all, delete-orphan"
    )
    practice_attempts = relationship(
        "PracticeAttempt", back_populates="problem", cascade="all, delete-orphan"
    )


# ─── Problem Solutions (One-to-Many) ─────────────────────────────
class ProblemSolution(Base):
    __tablename__ = "problem_solutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vault_problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    s3_file_url = Column(String(500), nullable=True)
    language = Column(
        Enum(SupportedLanguage, name="supported_language"),
        nullable=False,
        default=SupportedLanguage.CPP,
    )
    solution_type = Column(
        Enum(SolutionType, name="solution_type"),
        nullable=False,
        default=SolutionType.ORIGINAL_UPLOAD,
    )

    # The Deep-Scan Extraction Engine output:
    # Array of {approach_name, raw_code, complexity, explanation}
    extracted_approaches = Column(JSONB, nullable=True, default=list)

    # AI-generated overall analysis and line-by-line breakdown
    deep_analysis = Column(JSONB, nullable=True)

    # pgvector embedding for semantic similarity / anti-duplication
    # code_embedding = Column(Vector(768), nullable=True)  # Enable after pgvector extension

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    problem = relationship("VaultProblem", back_populates="solutions")


# ─── Practice Attempts (Telemetry) ───────────────────────────────
class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vault_problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    time_to_solve_seconds = Column(Integer, nullable=True)
    execution_ms = Column(Float, nullable=True)
    space_kb = Column(Float, nullable=True)
    hints_used = Column(Integer, default=0)
    is_optimal = Column(Boolean, default=False)
    passed = Column(Boolean, default=False)
    focus_lost_events = Column(Integer, default=0)

    # Relationships
    problem = relationship("VaultProblem", back_populates="practice_attempts")
    user = relationship("User", back_populates="practice_attempts")
