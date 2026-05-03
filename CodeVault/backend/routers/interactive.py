"""WebSocket endpoint for interactive code execution.

Lets the browser stream stdin to a running process and receive stdout /
stderr in real time, so programs that prompt the user mid-run
(`cin >> x` after a printed prompt, `input("name? ")`) work as expected.

We use plain subprocess pipes instead of a PTY for cross-platform
simplicity. Implications:
  - Python is launched with -u so stdout is unbuffered.
  - C++ / Java users must flush before reading (`<< endl`, `cout.flush()`,
    `System.out.flush()`) for prompts to appear before the read blocks.

Wire protocol (JSON text frames):

  Client → server:
    {type:"start", code, language, timeout_seconds?}
    {type:"stdin", data}            -- raw text incl. trailing "\n"
    {type:"stdin_close"}            -- signal EOF to the program
    {type:"kill"}                   -- terminate the process

  Server → client:
    {type:"started"}
    {type:"stdout"|"stderr", data}
    {type:"compile_error", data}
    {type:"error", data}            -- harness-level failure
    {type:"exit", code, ms}
"""

import asyncio
import json
import os
import tempfile
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.ai import generate_runner, has_main

router = APIRouter(prefix="/api/v1/execute", tags=["Execution"])

COMPILE_CMD = {
    "cpp": ["g++", "-std=c++17", "-O2", "-o", "{out}", "{src}"],
    "java": ["javac", "{src}"],
}

RUN_CMD = {
    # -u so prompts and partial lines appear immediately over the pipe.
    "python": ["python", "-u", "{src}"],
    "cpp": ["{out}"],
    "java": ["java", "-cp", "{dir}", "Solution"],
}

FILE_EXT = {"cpp": ".cpp", "python": ".py", "java": ".java"}


async def _send(ws: WebSocket, payload: dict) -> None:
    try:
        await ws.send_text(json.dumps(payload))
    except Exception:
        pass


async def _pump_stream(ws: WebSocket, stream: asyncio.StreamReader, kind: str) -> None:
    """Forward a subprocess output stream to the websocket as it arrives."""
    try:
        while True:
            chunk = await stream.read(1024)
            if not chunk:
                return
            await _send(ws, {"type": kind, "data": chunk.decode(errors="replace")})
    except Exception:
        return


@router.websocket("/ws")
async def interactive_execute(ws: WebSocket):
    await ws.accept()
    proc: asyncio.subprocess.Process | None = None
    pipe_tasks: list[asyncio.Task] = []
    input_task: asyncio.Task | None = None

    try:
        # ── 1. Wait for the start message ──────────────────────
        first = await ws.receive_text()
        msg = json.loads(first)
        if msg.get("type") != "start":
            await _send(ws, {"type": "error", "data": "expected start message"})
            return

        lang = (msg.get("language") or "").lower()
        code = msg.get("code", "")
        test_cases = msg.get("test_cases") or []
        timeout_s = int(msg.get("timeout_seconds", 60))
        if lang not in FILE_EXT:
            await _send(ws, {"type": "error", "data": f"Unsupported language: {lang}"})
            return

        # Auto-wrap function-only code when test cases provide stdin format.
        # We DO NOT push the wrapped code to the client yet — we wait until
        # compile succeeds, otherwise a buggy wrap would replace the user's
        # original source and leave them stuck (re-run would see has_main=True
        # and skip the wrap on the next attempt).
        wrapped_code: str | None = None
        if test_cases and not has_main(code, lang):
            wrapped_code = await generate_runner(code, lang, test_cases)
            if wrapped_code:
                code = wrapped_code

        with tempfile.TemporaryDirectory() as tmpdir:
            ext = FILE_EXT[lang]
            src_name = ("Solution" + ext) if lang == "java" else ("solution" + ext)
            src_path = os.path.join(tmpdir, src_name)
            out_path = os.path.join(
                tmpdir, "solution.exe" if os.name == "nt" else "solution"
            )
            with open(src_path, "w", encoding="utf-8") as f:
                f.write(code)

            # ── 2. Compile if needed ───────────────────────────
            if lang in COMPILE_CMD:
                cargs = [
                    a.format(src=src_path, out=out_path, dir=tmpdir)
                    for a in COMPILE_CMD[lang]
                ]
                try:
                    cproc = await asyncio.create_subprocess_exec(
                        *cargs,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=tmpdir,
                    )
                    _, cerr = await asyncio.wait_for(cproc.communicate(), timeout=30)
                    if cproc.returncode != 0:
                        err_text = cerr.decode(errors="replace")
                        # Surface the AI-generated wrap inline so the user can
                        # see what was attempted, but do NOT replace the editor
                        # contents — they need their original code intact to
                        # iterate (or to fix the wrap manually).
                        if wrapped_code:
                            err_text = (
                                "[AI auto-runner produced this wrap, "
                                "but it failed to compile. Editor was NOT "
                                "modified. Try editing the wrap manually or "
                                "add your own main.]\n\n" + err_text
                            )
                        await _send(ws, {"type": "compile_error", "data": err_text})
                        await _send(ws, {
                            "type": "exit",
                            "code": cproc.returncode,
                            "ms": 0,
                        })
                        return
                except asyncio.TimeoutError:
                    await _send(ws, {"type": "error", "data": "Compilation timed out"})
                    return
                except FileNotFoundError:
                    await _send(ws, {
                        "type": "error",
                        "data": f"Compiler not found for {lang}. Install g++ / javac.",
                    })
                    return

            # ── 2b. Syntax check for interpreted langs ─────────
            # Compiled langs already failed loud above. For Python we run
            # `compile()` so a broken AI wrap can't silently overwrite the
            # user's editor on the runner_added step below.
            if lang == "python" and wrapped_code:
                try:
                    compile(code, src_path, "exec")
                except SyntaxError as se:
                    await _send(ws, {
                        "type": "compile_error",
                        "data": (
                            "[AI auto-runner produced this wrap, but it has "
                            "a Python SyntaxError. Editor was NOT modified.]\n\n"
                            f"{se}"
                        ),
                    })
                    await _send(ws, {"type": "exit", "code": -1, "ms": 0})
                    return

            # ── 3. Spawn the running process ───────────────────
            rargs = [
                a.format(src=src_path, out=out_path, dir=tmpdir)
                for a in RUN_CMD[lang]
            ]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *rargs,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                )
            except FileNotFoundError:
                await _send(ws, {
                    "type": "error",
                    "data": f"Runtime not found for {lang}",
                })
                return

            # Compile succeeded (or no compile needed). Now it's safe to push
            # the AI wrap to the editor — we know it actually builds.
            if wrapped_code:
                await _send(ws, {"type": "runner_added", "code": wrapped_code})
            await _send(ws, {"type": "started"})
            start = time.perf_counter()
            pipe_tasks = [
                asyncio.create_task(_pump_stream(ws, proc.stdout, "stdout")),
                asyncio.create_task(_pump_stream(ws, proc.stderr, "stderr")),
            ]

            # ── 4. Forward client stdin / control messages ─────
            async def pump_input():
                try:
                    while True:
                        raw = await ws.receive_text()
                        m = json.loads(raw)
                        t = m.get("type")
                        if t == "stdin":
                            data = m.get("data", "")
                            if proc.stdin and not proc.stdin.is_closing():
                                try:
                                    proc.stdin.write(data.encode())
                                    await proc.stdin.drain()
                                except (ConnectionResetError, BrokenPipeError):
                                    return
                        elif t == "stdin_close":
                            if proc.stdin and not proc.stdin.is_closing():
                                try:
                                    proc.stdin.close()
                                except Exception:
                                    pass
                        elif t == "kill":
                            try:
                                proc.kill()
                            except Exception:
                                pass
                            return
                except WebSocketDisconnect:
                    try:
                        proc.kill()
                    except Exception:
                        pass

            input_task = asyncio.create_task(pump_input())

            # ── 5. Wait for the process to exit (or timeout) ───
            try:
                rc = await asyncio.wait_for(proc.wait(), timeout=timeout_s)
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                await _send(ws, {
                    "type": "error",
                    "data": f"Execution timed out after {timeout_s}s",
                })
                rc = -1

            # Drain remaining output before reporting exit.
            for t in pipe_tasks:
                try:
                    await asyncio.wait_for(t, timeout=2)
                except Exception:
                    t.cancel()

            elapsed = (time.perf_counter() - start) * 1000
            await _send(ws, {"type": "exit", "code": rc, "ms": round(elapsed, 2)})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await _send(ws, {"type": "error", "data": f"Server error: {e}"})
    finally:
        if input_task and not input_task.done():
            input_task.cancel()
        if proc and proc.returncode is None:
            try:
                proc.kill()
            except Exception:
                pass
        try:
            await ws.close()
        except Exception:
            pass
