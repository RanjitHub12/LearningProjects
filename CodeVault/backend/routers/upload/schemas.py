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


class TestRunResult(BaseModel):
    input: str
    expected_output: str
    actual_output: str = ""
    passed: bool = False
    error: str = ""


class WorkspaceSaveResponse(BaseModel):
    # status one of: saved | tests_failed | duplicate | no_tests | analysis_failed
    status: str
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
    # AI-wrapped version when the user's code lacked a main; populated only when
    # the runner step actually fired.
    executable_code: str = ""
    runner_added: bool = False


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
