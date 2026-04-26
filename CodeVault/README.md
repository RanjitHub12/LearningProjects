# 🔐 CodeVault

**AI-Powered Reverse LeetCode & Placement Preparation Platform**

A private, high-performance platform that ingests raw coding solution files in bulk and reverse-engineers them into a fully interactive, searchable workspace for technical interview preparation.

## ✨ Key Features

- **Deep-Scan Extraction Engine** — Parses single files containing multiple commented-out solutions, separating them into distinct evolutionary approaches (Brute Force → Memoization → Optimal)
- **AI-Powered Analysis** — Gemini-driven code analysis with line-by-line breakdowns and complexity inference
- **Zero-Latency Execution Sandbox** — Docker-based warm pool for instant code execution with telemetry capture
- **Placement Stress Suite** — Mock timers, tab-switch detection, and spaced-repetition analytics
- **Weakness Heatmap** — SM-2 algorithm targeting your weakest DSA topics

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+ (LTS)
- Python 3.11+

### Setup
```bash
# Clone and configure
cp .env.example .env   # Fill in your API keys

# Start all services
docker compose up -d

# Install frontend dependencies
cd client && npm install && npm run dev
```

### Services
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

## 🏗️ Tech Stack

- **Frontend:** React 18, Vite 5, styled-components, Recharts
- **Backend:** FastAPI, SQLAlchemy, Pydantic, Celery
- **Database:** PostgreSQL 16 (pgvector, pg_trgm)
- **AI:** Gemini API
- **Infra:** Docker, Redis, AWS S3, Nginx

## 📁 Project Structure

```
CodeVault/
├── api/          # FastAPI backend + Celery workers
├── client/       # React/Vite frontend
├── sandbox/      # Docker sandbox configurations
└── docker-compose.yml
```
