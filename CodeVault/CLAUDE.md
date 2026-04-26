# CodeVault — AI Context Guide

> Reduces token usage by giving the AI all project context upfront.

## Project

**CodeVault** — AI-powered reverse-LeetCode & placement prep platform.  
Private, invite-only. Ingests bulk `.cpp/.java/.py/.sql` files, uses Gemini to parse multiple commented approaches per file.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 6, styled-components, Recharts, react-dropzone, lucide-react |
| Backend | FastAPI, SQLAlchemy (async), Pydantic v2, Celery + Redis |
| Database | PostgreSQL 16 (pgvector, pg_trgm), host port **5433** |
| AI | Gemini API (google-genai) with heuristic fallback |
| Execution | Subprocess sandbox (dev), Docker warm pool (prod) |

## Directory Structure

```
CodeVault/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── config.py               # Pydantic BaseSettings
│   ├── database.py             # Async SQLAlchemy engine
│   ├── models.py               # ORM: User, VaultProblem, ProblemSolution, PracticeAttempt
│   ├── schemas.py              # Pydantic request/response models
│   ├── routers/
│   │   ├── health.py           # GET /health
│   │   ├── problems.py         # CRUD /api/v1/problems
│   │   ├── upload.py           # POST /api/v1/upload/single
│   │   └── execution.py        # POST /api/v1/execute
│   ├── services/
│   │   └── gemini_service.py   # Deep-scan engine (Gemini + heuristic fallback)
│   └── workers/
│       └── celery_app.py       # Celery config + stubs
├── frontend/
│   ├── src/
│   │   ├── main.jsx            # Entry: BrowserRouter + ThemeProvider + ThemeContext
│   │   ├── App.jsx             # All routes
│   │   ├── index.css           # CSS tokens with [data-theme="light"] support
│   │   ├── context/ThemeContext.jsx  # Light/dark mode state
│   │   ├── theme/GlobalStyles.js    # Minimal styled-components theme
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Sidebar (Lucide icons, theme toggle)
│   │   │   └── Dashboard.jsx   # Stats, radar, heatmap, triage
│   │   └── pages/
│   │       ├── Home.jsx, ProblemVault.jsx, Practice.jsx
│   │       ├── Upload.jsx, Workspace.jsx, Analytics.jsx, Admin.jsx
│   └── vite.config.js          # Proxy /api → localhost:8000
├── database/
│   ├── init.sql                # Extension setup
│   └── Dockerfile.sandbox
├── docker-compose.yml
└── claude.md                   # This file
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service status |
| GET | `/api/v1/problems` | List (filter: difficulty, tag, search) |
| GET | `/api/v1/problems/{id}` | Single problem |
| POST | `/api/v1/problems` | Create problem |
| PATCH | `/api/v1/problems/{id}` | Partial update (admin) |
| DELETE | `/api/v1/problems/{id}` | Delete + cascade |
| POST | `/api/v1/upload/single` | Upload & analyze single file |
| POST | `/api/v1/execute` | Run code (cpp/python/java) |

## Design System

- **Theme**: CSS custom properties + `[data-theme]` attribute
- **Dark**: bg `#0a0e17`, accent indigo `#6366f1`
- **Light**: bg `#f8fafc`, same accent
- **Icons**: Lucide React (no emojis)
- **Fonts**: Inter (body), JetBrains Mono (code)
- **Difficulty pills**: `.pill--easy` green, `.pill--medium` amber, `.pill--hard` red, `.pill--impossible` purple

## Conventions

- All colors via CSS variables (`var(--cv-xxx)`) — never hardcode hex in components
- Frontend fetches from `/api/v1/*` (Vite proxy → backend:8000)
- Empty states shown when no data; never hardcode mock data
- Styled-components use `${p => p.theme.xxx}` for spacing/radii only
- PostgreSQL host port is **5433**

## Phase Status

- [x] Phase 1: Core infrastructure
- [x] Phase 2: Upload + Gemini deep-scan engine
- [x] Phase 3: Code execution sandbox
- [x] Phase 4: Split-pane workspace + practice timer
- [x] Phase 5: Admin CRUD + Mass Purge
- [ ] Phase 6: Deploy (DigitalOcean + Nginx + SSL)
