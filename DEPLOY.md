# NAT 2.0 — Deployment Guide

## What You're Deploying

| Component | Where it runs | Notes |
|---|---|---|
| **NAT 2.0 Server** | Azure App Service (or Docker) | Express + WebSocket + React UI |
| **PostgreSQL** | Azure Database for PostgreSQL | Managed DB, not on the app server |
| **Chrome Extension** | User's Chrome browser | Load unpacked — no store required |
| **Remote Agent** | On-premise machine (has Chrome) | Connects to server over WebSocket |

> The server does NOT need a browser. The remote agent does.

---

## Option A — Azure App Service (Recommended)

### Prerequisites
- Azure subscription
- Node.js 20 installed locally (to build)
- PostgreSQL database (Azure Database for PostgreSQL Flexible Server)

---

### Step 1 — Provision Azure Resources

#### 1a. Create PostgreSQL Flexible Server
- Azure Portal → Create a resource → **Azure Database for PostgreSQL Flexible Server**
- Tier: **Burstable B1ms** (sufficient for most teams)
- Create a database named `nat20`
- Note your connection string:
  ```
  postgresql://USER:PASSWORD@SERVER.postgres.database.azure.com:5432/nat20?sslmode=require
  ```

#### 1b. Create App Service
- Azure Portal → Create a resource → **Web App**
- Runtime stack: **Node 20 LTS**
- OS: **Linux** (recommended) or Windows
- Plan: **B1 or higher** (Free tier does not support WebSockets)

---

### Step 2 — Configure App Service Settings

#### General Settings
Go to: App Service → **Configuration → General Settings**

| Setting | Value |
|---|---|
| Web Sockets | **ON** |
| Always On | **ON** |
| HTTP Version | 2.0 |
| ARR Affinity | OFF (stateless) |

#### Application Settings
Go to: App Service → **Configuration → Application Settings → + New application setting**

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://USER:PASS@SERVER.postgres.database.azure.com:5432/nat20?sslmode=require` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `SESSION_SECRET` | Any long random string (e.g. 64 random characters) |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | `1` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |

---

### Step 3 — Deploy the Code

#### Option A: GitHub Actions (automatic on every push)

1. Push this repo to GitHub
2. Go to App Service → **Deployment Center → GitHub Actions**
3. Authorize and select your repo/branch
4. Azure will generate a workflow file — replace it with `.github/workflows/azure-deploy.yml` from this repo
5. Add these **GitHub Secrets** (repo Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `AZURE_WEBAPP_NAME` | Your App Service name (e.g. `nat20-prod`) |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Contents of the publish profile file (download from App Service → Get publish profile) |

#### Option B: ZIP Deploy (manual)

```bash
# 1. Install dependencies and build
npm ci
npm run build

# 2. Create ZIP (include dist, package files, web.config)
zip -r deploy.zip dist/ package.json package-lock.json web.config

# 3. Deploy via Azure CLI
az webapp deploy \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_APP_NAME \
  --src-path deploy.zip \
  --type zip
```

#### Option C: VS Code Azure Extension
- Install **Azure App Service** extension in VS Code
- Right-click the `dist/` folder → **Deploy to Web App**

---

### Step 4 — Run Database Migrations

After first deploy, run migrations once:

```bash
# Set DATABASE_URL to your Azure PostgreSQL connection string
export DATABASE_URL="postgresql://USER:PASS@SERVER.postgres.database.azure.com:5432/nat20?sslmode=require"
npm run db:push
```

---

### Step 5 — Verify Deployment

Open: `https://YOUR-APP.azurewebsites.net`

You should see the NAT 2.0 login page. Check WebSocket connectivity:
```
https://YOUR-APP.azurewebsites.net/api/execution-agent/status
```
Expected: `{"total":0,"idle":0,"busy":0,"agents":[]}`

---

## Option B — Docker (Self-hosted / On-premise)

### Prerequisites
- Docker + Docker Compose installed
- PostgreSQL (included in docker-compose)

### Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env — set these required values:
#    ANTHROPIC_API_KEY=sk-ant-...
#    SESSION_SECRET=any-long-random-string
#    POSTGRES_PASSWORD=choose-a-password

# 3. Start server + database
docker compose up -d

# 4. Run database migrations (first time only)
docker compose exec nat20 node -e "
  const { execSync } = require('child_process');
  execSync('npm run db:push', { stdio: 'inherit' });
"

# 5. Open the app
open http://localhost:5000
```

### Useful Commands
```bash
docker compose logs -f nat20     # view server logs
docker compose restart nat20     # restart server
docker compose down              # stop everything
docker compose down -v           # stop + delete data volumes
```

---

## Remote Execution Agent Setup

The remote agent runs **on any machine that has Chrome/Chromium** (not on the server). It connects to the NAT 2.0 server and executes Playwright tests.

### Option A: Run directly with Node.js

**Requirements:** Node.js 20+, Chromium

```bash
# Navigate to the agent folder
cd remote-agent

# Install dependencies (first time only)
npm install

# Install Playwright browser (first time only)
npx playwright install chromium

# Start the agent — point it at your server
SERVER_URL=wss://your-app.azurewebsites.net npx tsx agent.ts

# For local server:
SERVER_URL=ws://localhost:5000 npx tsx agent.ts
```

You should see:
```
[RemoteAgent][agent-xxxx] Connected. Registering...
[RemoteAgent][agent-xxxx] Registered as agent-xxxx. Waiting for jobs...
```

### Option B: Run with Docker

```bash
cd remote-agent

# Build the agent image
docker build -t nat20-agent .

# Run pointing at your Azure server
docker run -e SERVER_URL=wss://your-app.azurewebsites.net nat20-agent

# Run pointing at local server
docker run -e SERVER_URL=ws://host.docker.internal:5000 nat20-agent
```

### Keep Agent Running (Windows — as a background process)

```powershell
# Using pm2 (install once: npm install -g pm2)
pm2 start "npx tsx agent.ts" --name nat20-agent --cwd "C:\path\to\remote-agent" `
  --env SERVER_URL=wss://your-app.azurewebsites.net

pm2 save        # persist across reboots
pm2 startup     # auto-start on Windows boot
```

---

## Chrome Extension Setup

The Chrome extension is included in the `chrome-extension/` folder. It does **not** need to be published to the Chrome Web Store.

### Install

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder from this repo

### Configure Server URL

1. Click the **DevX QE Recorder** icon in the toolbar
2. Click **▶ Server Settings** to expand
3. Enter your server URL:
   - Local: `ws://localhost:5000`
   - Azure: `wss://your-app.azurewebsites.net`
4. Click **Save** — the status dot turns green when connected

### Reload After Updates

If the extension code is updated, reload it:
- `chrome://extensions` → find DevX QE Recorder → click the **↺ reload icon**

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `SESSION_SECRET` | Yes | Random string for session encryption |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | No | Server port (default: 5000). Azure sets this automatically. |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | Yes (Azure) | Set to `1` — browser runs on remote agent |
| `ANTHROPIC_MODEL` | No | Override Claude model (default: claude-sonnet-4-6) |
| `ADO_ORGANIZATION` | No | Azure DevOps org (for ADO integration) |
| `ADO_PROJECT` | No | Azure DevOps project |
| `ADO_PAT` | No | Azure DevOps personal access token |
| `JIRA_BASE_URL` | No | Jira instance URL |
| `JIRA_EMAIL` | No | Jira login email |
| `JIRA_API_TOKEN` | No | Jira API token |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   User's Machine                    │
│                                                     │
│  ┌──────────────────┐    ┌─────────────────────┐   │
│  │  Chrome Browser  │    │   Remote Agent      │   │
│  │  + DevX Extension│    │   (npx tsx agent.ts)│   │
│  │                  │    │   Playwright + Chrome│   │
│  └────────┬─────────┘    └──────────┬──────────┘   │
│           │ wss://                  │ wss://        │
└───────────┼─────────────────────────┼───────────────┘
            │                         │
            ▼                         ▼
┌─────────────────────────────────────────────────────┐
│             Azure App Service                       │
│                                                     │
│  NAT 2.0 Server (Express + React)                   │
│  ├── /ws/recorder          ← Chrome Extension       │
│  ├── /ws/execution-agent   ← Remote Agent           │
│  └── /api/*                ← REST API               │
│                                                     │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Azure PostgreSQL       │
              │  Database              │
              └────────────────────────┘
```

---

## Troubleshooting

### WebSocket connection fails (Extension shows red dot)
- Verify **Web Sockets = ON** in Azure App Service General Settings
- Check the URL in extension popup uses `wss://` (not `ws://`) for Azure
- Ensure App Service plan is **B1 or higher** (Free tier blocks WebSockets)

### Remote agent gets 400 error
- Server not started, or needs restart after code update
- WebSocket path must be `/ws/execution-agent` — check no proxy is stripping the path

### Database connection fails
- Verify `DATABASE_URL` includes `?sslmode=require` for Azure PostgreSQL
- Check PostgreSQL firewall allows connections from App Service IP

### Build fails on Azure
- Ensure `SCM_DO_BUILD_DURING_DEPLOYMENT = true` in Application Settings
- Check `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 1` is set (prevents browser download during build)

### Tests not executing
- Verify remote agent is running and connected: `GET /api/execution-agent/status`
- If no agent connected, execution falls back to in-process (requires browser on server — not supported on Azure)
