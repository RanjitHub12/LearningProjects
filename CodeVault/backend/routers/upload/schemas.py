"""Pydantic models shared across upload sub-routers."""

from pydantic import BaseModel


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
    # Which engine produced the analysis. "groq" / "gemini" = real AI;
    # "groq-minimal" = AI but slimmer fallback (no deep analysis); "heuristic"
    # = no AI ran at all (keys missing / both providers failed).
    engine: str = ""


class WorkspaceSaveRequest(BaseModel):
    code: str
    language: str = "cpp"
    # Optional human hint when the AI couldn't infer the problem on its own
    # (e.g. "This is the Two Sum problem — find two indices summing to target").
    hint: str = ""
    # Optional context auto-populated from a loaded problem (LeetCode daily or
    # vault problem). When present these are folded into the AI prompt and
    # `test_cases` are preferred over AI-generated ones for the test phase.
    context_title: str = ""
    context_statement: str = ""
    context_tags: list[str] = []
    context_difficulty: str = ""
    context_test_cases: list[dict] = []
    # When true, skip the AI step entirely and persist using only the
    # context_* fields above as the user-supplied metadata. Used by the
    # Workspace's manual-entry form so the user can save without burning
    # AI quota or waiting for a rate-limited model.
    manual: bool = False


class WorkspaceSaveResponse(BaseModel):
    # status one of: saved | duplicate | analysis_failed
    status: str
    message: str
    title: str = ""
    difficulty: str = ""
    dsa_tags: list[str] = []
    problem_statement: str = ""
    approaches_found: int = 0
    approach_names: list[str] = []
    problem_id: str = ""
    duplicate_of_id: str = ""
    duplicate_of_title: str = ""
    # Which engine produced the analysis. "groq" / "groq-minimal" / "gemini"
    # are real AI; "heuristic" means both AI providers were unavailable;
    # "manual" means the user filled the form themselves. The frontend uses
    # this to nudge the user toward manual entry when AI quality is poor.
    engine: str = ""


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
