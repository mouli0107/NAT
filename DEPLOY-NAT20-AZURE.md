# Deploy NAT 2.0 ASTRA to Azure — Runbook

Container deploy via **GitHub Actions** → ghcr.io → **Azure App Service (Linux container)**,
with a new **Azure Database for PostgreSQL Flexible Server**.

> You run the `az` steps in **Azure Cloud Shell** (https://shell.azure.com) — `az` is not
> installed locally. Values in `<ANGLE_BRACKETS>` are yours to choose/paste; never commit them.

---

## 0. Facts this runbook is built on (verified in-repo)
- App: Express + Vite SPA, listens on `PORT` (fallback 5000), health at `/api/health` (does a DB ping).
- Image: multi-stage [Dockerfile](Dockerfile) (Node 20 + Chromium/Playwright libs). EXPOSE 5000.
- Pipeline: [.github/workflows/azure-deploy.yml](.github/workflows/azure-deploy.yml) builds → pushes
  `ghcr.io/mouli0107/nat20-astra` → deploys to App Service **`nat20-astra`** using GitHub secret
  `AZURE_WEBAPP_PUBLISH_PROFILE`. Triggers on **push to `main`** (or manual `workflow_dispatch`).
- DB schema: created with **`drizzle-kit push`** (the startup migrator is incomplete and only logs a
  warning — do NOT rely on it).

---

## 1. Variables (edit, then paste the block into Cloud Shell)
```bash
SUBSCRIPTION="93e72167-374e-4039-bd33-1012ae37cafb"   # MS-Sponsorship-GSS
RG="RG-Advantive"
LOCATION="eastus2"
PLAN="plan-nat20-linux"            # new plan (larger tier for Chromium + reviews)
APP="nat20-astra"                  # MUST match the workflow's AZURE_WEBAPP_NAME
PG_SERVER="nat20-pg-<unique>"      # globally unique
PG_DB="nat20"
PG_ADMIN="nat20admin"
PG_PASSWORD='<CHOOSE_A_STRONG_PASSWORD>'   # you choose; keep it secret

az account set --subscription "$SUBSCRIPTION"
```

---

## 2. App Service Plan (larger tier)
```bash
# B2 = 3.5 GB RAM (cost-effective). For more headroom use: --sku P1V3
az appservice plan create \
  --name "$PLAN" --resource-group "$RG" --location "$LOCATION" \
  --is-linux --sku B2
```

---

## 3. PostgreSQL Flexible Server + database
```bash
az postgres flexible-server create \
  --name "$PG_SERVER" --resource-group "$RG" --location "$LOCATION" \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 \
  --version 16 --public-access 0.0.0.0   # allow Azure services; adds a temp rule for your IP

az postgres flexible-server db create \
  --resource-group "$RG" --server-name "$PG_SERVER" --database-name "$PG_DB"

# Connection string the app needs (sslmode=require is mandatory on Azure PG):
export DATABASE_URL="postgresql://$PG_ADMIN:$PG_PASSWORD@$PG_SERVER.postgres.database.azure.com:5432/$PG_DB?sslmode=require"
echo "$DATABASE_URL"
```

---

## 4. Create the schema with drizzle-kit push (one time)
Run from Cloud Shell (clone the repo) **or** locally with the `DATABASE_URL` exported above.
This creates the COMPLETE schema from `shared/schema.ts` — the only reliable path.
```bash
git clone https://github.com/mouli0107/NAT.git && cd NAT
npm ci
npm run db:push          # uses $DATABASE_URL
```
Expect it to create all tables incl. `codelens_runs`, `codelens_check_cache`,
`codelens_suppressions`, `codelens_custom_standards`.

---

## 5. Create the Web App (Linux container) + settings
```bash
# Placeholder image; the GitHub Actions deploy will replace it with the real one.
az webapp create \
  --name "$APP" --resource-group "$RG" --plan "$PLAN" \
  --deployment-container-image-name "mcr.microsoft.com/azuredocs/aci-helloworld"

az webapp config set --name "$APP" --resource-group "$RG" \
  --web-sockets-enabled true --always-on true

# WEBSITES_PORT tells App Service the container listens on 5000.
# CODELENS_CACHE_PATH uses /home (persistent) so repo clones/cache survive restarts.
az webapp config appsettings set --name "$APP" --resource-group "$RG" --settings \
  WEBSITES_PORT=5000 \
  NODE_ENV=production \
  DATABASE_URL="$DATABASE_URL" \
  SESSION_SECRET='<LONG_RANDOM_STRING>' \
  AI_INTEGRATIONS_ANTHROPIC_API_KEY='<YOUR_ANTHROPIC_KEY>' \
  AI_INTEGRATIONS_ANTHROPIC_BASE_URL='https://api.anthropic.com' \
  ANTHROPIC_MODEL='claude-opus-4-1' \
  CODELENS_CACHE_PATH='/home/codelens-cache' \
  CODELENS_DETERMINISTIC_MODE='shadow'
```
Optional settings depending on features you use: `AI_INTEGRATIONS_OPENAI_API_KEY`,
`AZURE_DEVOPS_*`/`ADO_*`, `JIRA_*`, `SMTP_*`, `AZURE_STORAGE_CONNECTION_STRING`.

---

## 6. Let App Service pull the private ghcr.io image on restart
The workflow gives Azure a short-lived token at deploy time, but a later restart needs a durable
credential. Use a GitHub PAT with **`read:packages`** (classic) — you create it, you paste it:
```bash
az webapp config appsettings set --name "$APP" --resource-group "$RG" --settings \
  DOCKER_REGISTRY_SERVER_URL='https://ghcr.io' \
  DOCKER_REGISTRY_SERVER_USERNAME='mouli0107' \
  DOCKER_REGISTRY_SERVER_PASSWORD='<GHCR_READ_PACKAGES_PAT>'
```
(Alternative: make the ghcr package public — but the image contains app source, so a PAT is safer.)

---

## 7. Wire up GitHub Actions
```bash
# Download the publish profile (paste its FULL XML into the GitHub secret below)
az webapp deployment list-publishing-profiles \
  --name "$APP" --resource-group "$RG" --xml
```
In GitHub → repo **mouli0107/NAT** → Settings → Secrets and variables → Actions → New secret:
- `AZURE_WEBAPP_PUBLISH_PROFILE` = the XML from the command above.

---

## 8. Ship it
> ⚠️ This session's recent work (S43–S82 standards, per-user ownership/fair-limiter) is on the
> `claude/stoic-clarke-ab8c8f` branch and **must be committed and merged into `main`** or it won't
> be in the build.

```bash
# from your repo, once the work is on main:
git push origin main          # triggers the workflow
# or trigger manually from the Actions tab → "Deploy NAT 2.0 ASTRA…" → Run workflow
```

---

## 9. Verify
```bash
curl https://nat20-astra.azurewebsites.net/api/health      # {"status":"ok",...}
az webapp log tail --name "$APP" --resource-group "$RG"    # watch boot
```
Login: `chandramouli@nousinfo.com` / `Temp@1234` (forced password change on first login).

---

## 10. Harden before sharing the URL (security debt found in code)
- `/api/admin/migrate-data` uses a **hardcoded secret** `nat20-migrate-2026` ([server/index.ts](server/index.ts)) — change or remove it.
- The seeded admin password `Temp@1234` is in source — rotate it / change on first login.
- Set a strong `SESSION_SECRET` (don't leave it default/empty).
- Restrict the Postgres firewall to App Service outbound IPs once deployed (remove the broad rule).
