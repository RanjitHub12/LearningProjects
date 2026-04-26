"""
Execution Router — Sandboxed code execution endpoint.
Phase 3: Docker warm pool (simplified for dev: subprocess-based).
"""

import asyncio
import tempfile
import os
import time

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["Execution"])


class ExecutionRequest(BaseModel):
    code: str
    language: str = "cpp"
    stdin: str = ""
    timeout_seconds: int = 10


class ExecutionMetrics(BaseModel):
    execution_ms: float = 0
    memory_kb: float = 0
    passed: bool = False


class ExecutionResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    error: str = ""
    exit_code: int = -1
    metrics: ExecutionMetrics = ExecutionMetrics()


COMPILE_CMD = {
    "cpp": "g++ -std=c++17 -O2 -o {out} {src}",
    "java": "javac {src}",
}

RUN_CMD = {
    "cpp": "{out}",
    "python": "python {src}",
    "java": "java -cp {dir} Solution",
}

FILE_EXT = {"cpp": ".cpp", "python": ".py", "java": ".java", "sql": ".sql"}


@router.post("/execute", response_model=ExecutionResponse)
async def execute_code(req: ExecutionRequest):
    """Execute code in a sandboxed subprocess."""
    lang = req.language.lower()

    if lang not in FILE_EXT:
        return ExecutionResponse(error=f"Unsupported language: {lang}")

    with tempfile.TemporaryDirectory() as tmpdir:
        ext = FILE_EXT[lang]
        src_name = "Solution" + ext if lang == "java" else "solution" + ext
        src_path = os.path.join(tmpdir, src_name)
        out_path = os.path.join(tmpdir, "solution")

        # Write source file
        with open(src_path, "w") as f:
            f.write(req.code)

        # Compile if needed
        if lang in COMPILE_CMD:
            compile_cmd = COMPILE_CMD[lang].format(src=src_path, out=out_path, dir=tmpdir)
            try:
                proc = await asyncio.create_subprocess_shell(
                    compile_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
                if proc.returncode != 0:
                    return ExecutionResponse(
                        stderr=stderr.decode(errors="replace"),
                        error="Compilation failed",
                        exit_code=proc.returncode,
                    )
            except asyncio.TimeoutError:
                return ExecutionResponse(error="Compilation timed out")
            except FileNotFoundError:
                return ExecutionResponse(error=f"Compiler not found for {lang}. Install g++ / javac.")

        # Run
        run_cmd = RUN_CMD.get(lang, "").format(src=src_path, out=out_path, dir=tmpdir)
        if not run_cmd:
            return ExecutionResponse(error=f"No run command for {lang}")

        try:
            start = time.perf_counter()
            proc = await asyncio.create_subprocess_shell(
                run_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=req.stdin.encode()),
                timeout=req.timeout_seconds,
            )
            elapsed = (time.perf_counter() - start) * 1000

            return ExecutionResponse(
                stdout=stdout.decode(errors="replace").strip(),
                stderr=stderr.decode(errors="replace").strip(),
                exit_code=proc.returncode,
                metrics=ExecutionMetrics(
                    execution_ms=round(elapsed, 2),
                    memory_kb=0,
                    passed=proc.returncode == 0,
                ),
            )
        except asyncio.TimeoutError:
            return ExecutionResponse(error=f"Execution timed out after {req.timeout_seconds}s")
        except FileNotFoundError:
            return ExecutionResponse(error=f"Runtime not found for {lang}")
