# CodeVault Deployment Guide

This guide deploys CodeVault for a small public college evaluation group. It assumes the frontend and API are reachable over HTTPS and that the database is private. The application is a React/Vite SPA, FastAPI API, PostgreSQL database, Redis service, Groq/Gemini AI integration, and subprocess code runner.

## 1. Deployment recommendation

For a no-cost evaluation deployment, use a free static frontend host plus a free container/API host and managed PostgreSQL/Redis services where available. Free tiers can sleep, limit CPU, delete inactive databases, or change their terms. Do not use free hosting for important student data without backups.

The simplest reliable arrangement is:

- Frontend: deploy `frontend/dist` to a static HTTPS host.
- API: deploy `backend/Dockerfile` to a container host that supports WebSockets.
- Database: use managed PostgreSQL with `pgvector`, or run the included PostgreSQL image on the API host.
- Redis: use managed Redis or the included Redis container.
- Public access: put the API behind HTTPS and configure the frontend origin in `CORS_ORIGINS`.

The API container includes `g++`, Java, and Python for the code runner. Choose a host that permits subprocesses and does not block WebSocket upgrades.

## 2. Required production values

Create a deployment-only environment configuration. Never commit it.

```env
ENVIRONMENT=production
JWT_SECRET=<at-least-32-random-characters>
CORS_ORIGINS=https://your-frontend-domain.example
POSTGRES_USER=codevault
POSTGRES_PASSWORD=<long-random-database-password>
POSTGRES_DB=codevault_db
GROQ_API_KEY=<rotated-groq-key>
GEMINI_API_KEY=<optional-fallback-key>
```

Generate a secret with PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Use the real HTTPS frontend origin only. Do not use `*` with authenticated cookies.

## 3. Local production rehearsal

Run these commands from the repository root:

```powershell
Copy-Item .env.example .env
# Edit .env with real values.

docker compose --env-file .env -f docker-compose.production.yml up -d --build

docker compose -f docker-compose.production.yml ps
Invoke-RestMethod http://localhost:8000/health
```

Expected health response contains `status: ok`.

The production override removes source bind mounts, removes database and Redis host ports, uses two API workers, and disables development reload. Do not run the production override with an empty `JWT_SECRET`.

## 4. Frontend deployment

Build the SPA:

```powershell
cd frontend
npm ci
npm run build
```

Publish the contents of `frontend/dist` to the static host. Configure SPA fallback so every unknown path serves `index.html`; otherwise direct visits to `/workspace`, `/folders`, or `/analytics` may return 404.

The frontend must call the API through the same HTTPS origin or through an API origin listed in `CORS_ORIGINS`. Because sessions use HttpOnly cookies, cross-origin hosting must support credentials and HTTPS. A reverse proxy under one domain is the least error-prone arrangement.

## 5. First account

Open the deployed frontend and register the first account. The first registered account becomes the administrator. The registration flow does not use a registration code, so anyone who knows the public URL can register. For a small evaluation group, protect the URL with the hosting provider's access control or a reverse proxy, or add an invitation-only flow before a wider public launch.

After registration, verify:

- The username appears in the top-right account control.
- Logout returns to the login screen.
- Login restores the Dashboard.
- A normal user cannot use Admin destructive actions.

## 6. Reverse proxy requirements

If using Nginx, proxy `/api/` to the API service and serve the frontend as an SPA. Include WebSocket upgrade headers for `/api/v1/execute/ws`:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /api/v1/execute/ws {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 90s;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Use a real TLS certificate. Never expose PostgreSQL or Redis directly to the Internet.

## 7. Deployment smoke test

Run this checklist after every deployment:

1. `GET /health` returns `200`.
2. The frontend loads over HTTPS with no mixed-content errors.
3. Register a test account or log in with the admin account.
4. Confirm an unauthenticated API request returns `401`.
5. Confirm the Dashboard, Problem Vault, Upload, Workspace, Folders, Analytics, and Admin routes load.
6. Upload a small `.cpp`, `.java`, and `.py` file and confirm Groq analysis completes.
7. Run one C++, Java, and Python program.
8. Test Workspace interactive execution and stdin.
9. Test LeetCode daily retrieval.
10. Test logout and login again.
11. Confirm a non-admin account receives `403` for admin wipe.
12. Confirm database backup and restore procedures.

## 8. Data and security operations

- Keep `JWT_SECRET`, AI keys, database passwords, and provider tokens in the host secret manager.
- Rotate any key that appeared in terminal output, logs, screenshots, or Git history.
- Keep PostgreSQL and Redis on private networking.
- Set resource and timeout limits on the API host. Code execution runs untrusted student code.
- Restrict public API request rates, especially upload and execution endpoints.
- Configure database backups before storing real student work.
- Monitor API, worker, database, and Redis logs.
- Do not expose `/docs` publicly unless the deployment is access-controlled.
- Do not enable Docker development bind mounts or `--reload` in production.
- Keep the production frontend and API on HTTPS so session cookies remain secure.

## 9. Updating and rollback

```powershell
git pull origin master
cd frontend
npm ci
npm run build
cd ..
docker compose --env-file .env -f docker-compose.production.yml up -d --build
```

Before updating, record the current image or Git commit and take a database backup. If the smoke test fails, redeploy the previous commit/image and restore the database only if a migration changed its schema.

## 10. Current limitations

- SQL files can be uploaded and analyzed but are not executable in the code runner.
- Free hosting may sleep or impose limits.
- Registration is open by design; public access should be protected by host access control until invitation management is added.
- The frontend bundle is large and has a Vite chunk-size warning; this is a performance improvement rather than a release blocker.
- Object storage is optional and is not required for the local database-backed evaluation flow.
