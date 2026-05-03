# CodeVault

**AI-powered reverse-LeetCode & placement-prep platform.** Private, invite-only. Drop in `.cpp / .java / .py / .sql` files (or write code directly), and CodeVault parses multi-approach commented solutions, runs them in a sandbox, and lets you organise everything in nested local folders.

---

## Features

### Workspace
- **Live interactive Run** — every Run opens a streaming WebSocket. Output appears as it's printed; type runtime input into the inline `stdin ›` bar while the program is alive.
- **AI auto-runner** — paste a LeetCode-style function with no `main` and Run still works: when the loaded problem has test cases, the AI wraps the function with a stdin-driven driver before compiling. The wrapped code only replaces the editor *after* a successful compile, so a buggy wrap never strands you.
- **Fullscreen mode** — distraction-free editor with a resizable right-hand panel (drag handle, 240–900px, persisted in `localStorage`) that holds the live console, runtime stdin bar, and a Re-run button so you can hammer different inputs without leaving fullscreen.
- **Stdin staging panel** — pre-fill input one value per line and have it piped automatically when the program starts. Includes a "Load sample" dropdown that pulls from the loaded problem's test cases.
- **Save-to-Vault pipeline** — analyze → (auto-wrap if no main) → run all generated tests → dedup → save. On `analysis_failed` / `no_tests`, a textarea + "Retry with hint" button lets you give the AI human context and re-run the pipeline.
- **LeetCode daily** — fetches today's challenge via a backend GraphQL proxy, hydrates the editor with the language-appropriate boilerplate, drops the example test cases into the Input panel, and stamps a Mark Solved entry.
- **Solve tracking** — every successful save (or explicit Mark Solved) records to `localStorage` for the dashboard / streak / contribution calendar.
- **Snippets & folders** — nested local folders (`parentId`-keyed tree, no cycles), per-snippet metadata, in-Workspace folder shortcut modal.

### Vault & organization
- **Problem Vault** — searchable, difficulty-filtered list of every problem you've saved.
- **Folders page** — three-pane local file browser (tree / file list / preview), inline rename, "+ subfolder" per row, breadcrumbs, filter chips for difficulty and tag, "Add from Vault" modal that copies an existing problem in.
- **Bulk Upload** — drop multiple files into a chosen destination folder. Each file becomes both a vault problem and a folder snippet linked via `vaultProblemId`.

### Analytics
- **Dashboard** — editorial hero, 4 stat tiles, proficiency radar (Recharts), recent solves with click-through, weakest-topic triage.
- **Calendar** — contribution heatmap on local-day keys (not UTC — important for non-UTC users), click a cell for an inline popover listing every solve from that day.
- **Charts** — last-30-day bar, difficulty mix, streak detail.

### Admin
- **CRUD over saved problems** with edit / delete.
- **Mass purge** and **localhost-only `/admin/wipe-all`** for clearing the whole vault during dev.
- **Clear local data** for resetting `localStorage` (folders, snippets, solve log) without touching the DB.

### AI engine
- **Groq → Gemini → heuristic** dispatch chain. Groq (LLaMA 3.3) is primary; Gemini Flash is the network fallback; an offline pattern-matcher is the last resort.
- **EXTRACTION_PROMPT** — extracts title, problem statement, difficulty, tags, multi-approach breakdowns with line-by-line explanations, deep analysis (insights + common mistakes), and generated test cases.
- **RUNNER_PROMPT** — strict prompt for wrapping function-only code with a stdin-driven main. Enforces correct Java class name (`Solution`, matching the harness file `Solution.java`), LeetCode stdin parsing (`nums = [2,7,11,15], target = 9`), exact output format, and required headers (`#include <bits/stdc++.h>`, `import java.util.*;`, `import sys, json, re`).

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 · Vite 6 · react-router-dom · styled-components · Monaco editor · Recharts · react-dropzone · lucide-react |
| Backend | FastAPI · SQLAlchemy async · Pydantic v2 · Celery + Redis (stubbed) · httpx |
| DB | PostgreSQL 16 (pgvector, pg_trgm) — host port **5433** |
| AI | Groq (primary) → Gemini (fallback) → heuristic (last resort) |
| Execution | Subprocess sandbox (dev). Interactive runs use `asyncio.create_subprocess_exec` with piped stdin/stdout/stderr over WebSocket — no PTY (Python is launched with `-u`; C++/Java need to flush before reads) |

---

## Project layout

```
CodeVault/
├── backend/
│   ├── main.py                  FastAPI app, CORS, router registration
│   ├── config.py · database.py · models.py · schemas.py
│   ├── routers/
│   │   ├── health.py            GET  /health
│   │   ├── problems.py          CRUD /api/v1/problems
│   │   ├── execution.py         POST /api/v1/execute (one-shot, with optional AI wrap)
│   │   ├── interactive.py       WS   /api/v1/execute/ws (live stdin + streaming I/O)
│   │   ├── leetcode.py          GET  /api/v1/leetcode/daily (proxies LC GraphQL)
│   │   ├── admin.py             POST /api/v1/admin/wipe-all (localhost-only)
│   │   └── upload/              /api/v1/upload/* — combined APIRouter
│   │       ├── single.py        POST /single (bulk upload pipeline)
│   │       ├── workspace.py     POST /save-from-workspace (analyze→wrap→test→save, accepts hint)
│   │       └── analyze.py       POST /analyze (AI only, no DB write)
│   └── services/ai/             Split AI engine
│       ├── prompts.py           EXTRACTION_PROMPT, RUNNER_PROMPT (strict)
│       ├── clients.py           Lazy Groq + Gemini clients
│       ├── analyzer.py          Groq → Gemini → heuristic dispatcher (accepts hint)
│       ├── runner.py            has_main() detector + generate_runner() wrapper
│       └── heuristic.py         Offline pattern-matching fallback
├── frontend/src/
│   ├── App.jsx                  Routes
│   ├── index.css                Argyle-aesthetic CSS tokens, dark + light gradient bg
│   ├── components/
│   │   ├── Layout.jsx           Sidebar
│   │   ├── PageHeader.jsx       Reusable editorial header
│   │   ├── Toast.jsx            Centered modal-style toast + async confirm()
│   │   └── Dashboard/           index, Hero, Stats, RadarCard, RecentSolves, Triage
│   ├── lib/
│   │   ├── activity.js          localStorage solve log; LOCAL-day keys
│   │   └── folders.js           Nested folders via parentId; cycle-safe
│   └── pages/
│       ├── Workspace/           index, Toolbar, LeftPane, StdinPanel, ConsolePanel, FullscreenView, SaveModal, SnippetsModal, DailyModal
│       ├── Folders/             index, Tree, FileList, PreviewPane, NewFileModal, AddFromVaultModal
│       ├── Upload/              index, FolderPicker, Dropzone, Results
│       └── Analytics/           index, Calendar, Charts
├── database/init.sql · Dockerfile.sandbox
├── docker-compose.yml
└── CLAUDE.md                    Pre-loaded AI context guide
```

---

## Quick start

### Prerequisites
- Docker Desktop (for PostgreSQL + Redis)
- Node.js 20+
- Python 3.11+
- `g++` and `javac` on `PATH` for code execution

### Setup

```bash
# 1. Clone, configure env
cp .env.example .env
# fill in: GROQ_API_KEY, GEMINI_API_KEY, DATABASE_URL

# 2. Start Postgres + Redis
docker compose up -d

# 3. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 4. Frontend
cd ../frontend
npm install
npm run dev
```

| Service     | URL                            |
|-------------|--------------------------------|
| Frontend    | http://localhost:5173          |
| API         | http://localhost:8000          |
| API docs    | http://localhost:8000/docs     |
| PostgreSQL  | localhost:**5433**             |
| Redis       | localhost:6379                 |

The Vite proxy forwards `/api/*` (including WebSocket upgrades) to `localhost:8000`, so the frontend hits relative paths.

---

## API endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET    | `/health` | |
| GET    | `/api/v1/problems` | filter: `difficulty`, `tag`, `search`, `limit` |
| GET    | `/api/v1/problems/{id}` | full record |
| POST   | `/api/v1/problems` | |
| PATCH  | `/api/v1/problems/{id}` | |
| DELETE | `/api/v1/problems/{id}` | cascades solutions + practice attempts |
| POST   | `/api/v1/upload/single` | bulk-upload single file → vault problem |
| POST   | `/api/v1/upload/save-from-workspace` | analyze + run tests + dedup + save (accepts `hint`) |
| POST   | `/api/v1/upload/analyze` | AI analysis only, no DB write |
| POST   | `/api/v1/execute` | one-shot execution; auto-wraps if `test_cases` provided + no main |
| **WS** | `/api/v1/execute/ws` | **interactive execution — streaming stdout/stderr + live stdin** |
| GET    | `/api/v1/leetcode/daily` | parsed LC daily (snippets + test cases) |
| POST   | `/api/v1/admin/wipe-all` | TRUNCATE everything — rejected for non-localhost |

### Interactive WS protocol

```
client → server:
  {type: "start", code, language, test_cases?, timeout_seconds?}
  {type: "stdin", data}            # raw text incl. trailing "\n"
  {type: "stdin_close"}            # signal EOF
  {type: "kill"}                   # terminate the process

server → client:
  {type: "runner_added", code}     # only sent after the wrap COMPILED successfully
  {type: "started"}
  {type: "stdout" | "stderr", data}
  {type: "compile_error", data}    # editor is NOT modified on compile failure
  {type: "error", data}            # harness-level failure
  {type: "exit", code, ms}
```

---

## Conventions

- **Colors**: only via `var(--cv-...)` CSS tokens — never hardcode hex.
- **Fonts**: `--cv-font-sans` Inter, `--cv-font-display` Fraunces, `--cv-font-mono` JetBrains Mono.
- **Date keys**: always **local** `YYYY-MM-DD` (helpers in `lib/activity.js`). Never `.toISOString().slice(0,10)` — that's UTC and silently breaks streaks for non-UTC users.
- **Confirms / alerts**: never `window.confirm` / `alert()` — use `useToast()` (`toast({kind, title, message})` and `await confirm({...})`).
- **Page headers**: secondary pages use `<PageHeader eyebrow title accent subtitle>{actions}</PageHeader>`. Dashboard has its own custom hero.
- **Empty states**: render explicit guidance, never mock data.
- **Big features are package directories**, not single files. Workspace, Folders, Upload, Analytics, and Dashboard all follow this. Vite resolves `pages/Foo` to `pages/Foo/index.jsx` automatically.
- **AI engine imports**: prefer `from services.ai import …`. The `services.gemini_service` module is a back-compat shim.

---

## Frontend storage keys

| Key | Where | Shape |
|-----|-------|-------|
| `cv:activity` | localStorage | `[{problemId, title, difficulty, tags, source, solvedAt}]` |
| `cv:folders`  | localStorage | `[{id, name, parentId, createdAt}]` |
| `cv:snippets` | localStorage | `[{id, folderId, title, language, code, savedAt, ..., vaultProblemId?}]` |
| `cv:code:<pid|scratch>:<lang>` | sessionStorage | editor draft |
| `cv:stdin:<pid|scratch>` | sessionStorage | stdin panel draft |
| `cv:practice:<pid>` | sessionStorage | `{startedAt}` for timer mode |
| `cv:fs:panelW` | localStorage | fullscreen side-panel width (px) |

---

## Key flows

**Bulk Upload → Folders.** Step 1 picks a destination folder (must exist). Step 2 drops files. Each successful upload creates a vault problem AND a folder snippet linked via `vaultProblemId`.

**Workspace Run (interactive).** Click Run → WebSocket opens → AI wrap fires if needed (only pushed to editor on compile success) → process spawns → output streams in → type stdin in the `stdin ›` bar → press Stop or wait for exit.

**Save to Vault.** Pipeline is analyze → (auto-wrap if no main) → run all generated tests → dedup → save. If the AI cannot infer the problem, the SaveModal surfaces a hint textarea so you can supply human context and retry.

**Folders.** Tree view (chevrons), inline rename, "+ subfolder" per row, breadcrumbs, filter chips for difficulty + tag (auto-derived), Add-from-Vault modal copies an existing problem in.

**Calendar.** Cells are buttons; click selects a day → inline popover lists every solve that day with click-through to Workspace. Local-day keys throughout.

---

## Phase status

- [x] Core infra · upload + AI engine · execution sandbox · split-pane workspace
- [x] Admin CRUD · Mass Purge · localhost wipe-all
- [x] Save-to-Vault pipeline · LeetCode daily · stdin panel · solve tracking
- [x] Argyle UI redesign · editorial PageHeader · centered toast/confirm
- [x] Nested folders · Add-from-Vault · folder-scoped filters · Upload→folder destination
- [x] AI auto-runner: Save-to-Vault wraps function-only code with a generated `main`
- [x] AI auto-runner on the Run path (`/execute` accepts `test_cases`)
- [x] **Interactive stdin during runtime** — `/api/v1/execute/ws` WebSocket streams stdout/stderr; Workspace "Run" button sends typed lines (subprocess pipes, no PTY)
- [x] Resizable fullscreen side panel with live console + runtime stdin + Re-run
- [x] Manual hint flow when AI can't infer a problem from code alone
- [x] Hardened `RUNNER_PROMPT` (Java class name = Solution, LC stdin parsing, exact output format, mandatory headers)
- [x] Compile-then-commit wrap ordering — buggy wraps never overwrite the editor
- [x] Project reorganised — backend `services/ai/*` + `routers/upload/*`; frontend `Workspace/`, `Folders/`, `Dashboard/`, `Upload/`, `Analytics/` are now package directories
- [ ] GitHub repo storage for code (OAuth + sync) — deferred
- [ ] Phase 6: Deploy (DigitalOcean · Nginx · SSL)
