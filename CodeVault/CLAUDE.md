# CodeVault — AI Context Guide

> Pre-loaded project context to reduce token usage. Update when structure or conventions change.

## Project

AI-powered reverse-LeetCode & placement prep platform. Private, invite-only. Ingests `.cpp/.java/.py/.sql` files, parses multi-approach commented solutions, runs them in a sandbox, lets the user organise everything in nested local folders.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 · Vite 6 · react-router-dom · styled-components · Monaco editor · Recharts · react-dropzone · lucide-react |
| Backend | FastAPI · SQLAlchemy async · Pydantic v2 · Celery + Redis (stubbed) · httpx |
| DB | PostgreSQL 16 (pgvector, pg_trgm) — host port **5433** |
| AI | Groq (primary) → Gemini (fallback) → heuristic (last resort) |
| Execution | Subprocess sandbox (dev) · Docker warm pool (prod, planned) |

## Directory layout

```
CodeVault/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── config.py · database.py · models.py · schemas.py
│   ├── routers/
│   │   ├── health.py            # GET  /health
│   │   ├── problems.py          # CRUD /api/v1/problems
│   │   ├── upload.py            # POST /upload/single, /upload/save-from-workspace, /upload/analyze
│   │   ├── execution.py         # POST /execute
│   │   ├── leetcode.py          # GET  /leetcode/daily   (returns snippets + parsed testCases)
│   │   └── admin.py             # POST /admin/wipe-all   (localhost-only)
│   ├── services/gemini_service.py
│   └── workers/celery_app.py
├── frontend/src/
│   ├── main.jsx                 # BrowserRouter > ThemeProvider > ToastProvider > App
│   ├── App.jsx                  # Routes (Practice page deleted)
│   ├── index.css                # Argyle-aesthetic CSS tokens, dark + light gradient bg
│   ├── context/ThemeContext.jsx
│   ├── theme/GlobalStyles.js
│   ├── components/
│   │   ├── Layout.jsx           # Sidebar (Dashboard, Problem Vault, Upload, Workspace, Folders, Analytics, Admin)
│   │   ├── Dashboard.jsx        # Editorial hero (custom argyle SVG) + sectioned stats / radar / recent / triage
│   │   ├── PageHeader.jsx       # Reusable editorial header (eyebrow + display title + ornament)
│   │   └── Toast.jsx            # Centered modal-style toast + async confirm() — useToast()
│   ├── lib/
│   │   ├── activity.js          # localStorage solve log; LOCAL-day keys (not UTC)
│   │   └── folders.js           # Nested folders via parentId; snippets carry vaultProblemId
│   └── pages/
│       ├── Home.jsx             # → Dashboard
│       ├── ProblemVault.jsx     # Browse vault, search + difficulty filter
│       ├── Upload.jsx           # Step 1: pick destination folder · Step 2: drop files
│       ├── Workspace.jsx        # Editor + console + stdin panel; toolbar has overflow "More" menu
│       ├── Folders.jsx          # Folder tree (chevron expand) · file list with diff/tag filters · vault import
│       ├── Analytics.jsx        # Interactive contribution calendar (click day → solves popover)
│       └── Admin.jsx            # Edit/delete · Clear local data · Wipe DB · Mass Purge
├── database/init.sql · Dockerfile.sandbox
├── docker-compose.yml
└── CLAUDE.md                    # This file
```

## API endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | |
| GET | `/api/v1/problems` | filter: `difficulty`, `tag`, `search`, `limit` |
| GET | `/api/v1/problems/{id}` | full record (solutions + approaches + deep_analysis) |
| POST | `/api/v1/problems` | |
| PATCH | `/api/v1/problems/{id}` | |
| DELETE | `/api/v1/problems/{id}` | cascades solutions + practice attempts |
| POST | `/api/v1/upload/single` | bulk-upload single file → vault problem |
| POST | `/api/v1/upload/save-from-workspace` | analyze + run tests + dedup + save (auto-records solve on success) |
| POST | `/api/v1/upload/analyze` | AI analysis only, no DB write — used by Folders → New File |
| POST | `/api/v1/execute` | code + lang + stdin; auto-appends `\n` to stdin to avoid blocked reads |
| GET | `/api/v1/leetcode/daily` | proxies LC GraphQL; returns `snippets{cpp,python,java}` + parsed `testCases` |
| POST | `/api/v1/admin/wipe-all` | TRUNCATE all vault tables (rejected for non-localhost) |

## Frontend storage keys

| Key | Shape | Where it's used |
|-----|-------|-----------------|
| `cv:activity` (localStorage) | `[{problemId,title,difficulty,tags,source,solvedAt}]` | streak, calendar, recent solves |
| `cv:folders` (localStorage) | `[{id,name,parentId,createdAt}]` | nested folder tree |
| `cv:snippets` (localStorage) | `[{id,folderId,title,language,code,savedAt,description?,difficulty?,tags?,testCases?,vaultProblemId?}]` | Folders page + Workspace `?snippet=ID` |
| `cv:code:<pid|scratch>:<lang>` (sessionStorage) | string | editor draft persistence |
| `cv:stdin:<pid|scratch>` (sessionStorage) | string | stdin panel persistence |
| `cv:practice:<pid>` (sessionStorage) | `{startedAt}` | timer mode (still works via `?practice=true`) |

## Conventions (do not violate)

- **Colors**: only via CSS vars `var(--cv-...)` — never hardcode hex in components.
- **Fonts**: `--cv-font-sans` Inter (body), `--cv-font-display` Fraunces (h1, large stat values), `--cv-font-mono` JetBrains Mono.
- **Date keys**: always local YYYY-MM-DD (use `lib/activity.js` helpers). Never `.toISOString().slice(0,10)` — that's UTC and silently breaks streaks for non-UTC users.
- **Confirms / alerts**: never `window.confirm` or `alert()` — use `useToast()` (`toast({kind, title, message})` and `await confirm({...})`).
- **Page headers**: secondary pages use `<PageHeader eyebrow title accent subtitle>{actions}</PageHeader>`. Dashboard has its own custom hero.
- **Empty states**: render explicit guidance, never mock data.
- **Vite proxy**: frontend hits `/api/v1/*`; vite forwards to `localhost:8000`.
- **PostgreSQL host port**: 5433.
- **Workspace toolbar**: keep Run / Mark Solved / Input / language picker primary; everything else lives behind `MoreHorizontal` overflow menu.
- **Folder schema**: top-level folders have `parentId: null`. Cycles forbidden via `lib/folders.js#isDescendant`.

## Design system (argyle aesthetic)

- Body has a fixed `::before` argyle lattice (45°/-45° diamond grid + rose stitch dots) over a multi-layer painterly background.
- **Light mode**: lavender → cream → blush diagonal gradient + corner radial halos (mint top-right, blush bottom-right, lavender top-left).
- **Dark mode**: deep indigo with the same lattice motif.
- Glass cards have masked gradient borders (indigo → rose → blue) painted via `::before`.
- Primary buttons use `var(--cv-gradient-primary)`; difficulty pills come pre-styled (`.pill .pill--easy/medium/hard/impossible/tag`).
- Active sidebar nav links get a small rotated rose diamond accent.

## Key flows

**Bulk Upload → Folders**: Step 1 picks a destination folder (must exist), Step 2 drops files. Each successful upload creates a vault problem AND a folder snippet linked via `vaultProblemId`.

**Workspace stdin**: panel toggled by Input button. Has Load-sample dropdown that pulls from `problem.generated_test_cases`. Backend appends `\n` so blocking reads don't hang.

**Save to Vault**: pipeline is analyze → run tests → dedup → save. On `status === 'saved'` we auto-`recordSolve()` so analytics update without a separate Mark Solved click.

**Folders**: tree-view (chevrons), inline rename, "+ subfolder" per row, breadcrumbs above file list, filter chips for difficulty + tag (auto-derived from current folder), Add-from-Vault modal copies an existing vault problem in.

**Calendar**: cells are buttons; click selects a day → inline popover lists every solve that day with click-through to Workspace. Auto-scrolls to the latest week. Local-day keys throughout.

## Phase status

- [x] Core infra · upload + AI engine · execution sandbox · split-pane workspace
- [x] Admin CRUD · Mass Purge · localhost wipe-all
- [x] Save-to-Vault pipeline · LeetCode daily · stdin panel · solve tracking
- [x] Argyle UI redesign · editorial PageHeader · centered toast/confirm
- [x] Nested folders · Add-from-Vault · folder-scoped filters · Upload→folder destination
- [x] Practice page removed (folder filters subsume it)
- [ ] Interactive stdin during runtime (WebSocket pty) — deferred
- [ ] GitHub repo storage for code (OAuth + sync) — deferred
- [ ] Phase 6: Deploy (DigitalOcean · Nginx · SSL)
