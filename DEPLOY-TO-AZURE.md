# Deploy HealthDrive Apps to Azure — Step by Step

## Azure Context
- **Subscription**: MS-Sponsorship-GSS (`93e72167-374e-4039-bd33-1012ae37cafb`)
- **Resource Group**: `RG-Advantive` (eastus2)
- **App Service Plan**: `plan-advantive-one` (B1, Linux) — reuse, do NOT recreate
- **Runtime**: `NODE:20-lts`
- **Deployment**: Azure Cloud Shell (no local CLI)

---

## App Names (will be created)
| App | Azure Name | URL (after deploy) |
|---|---|---|
| App A — Ticket Tracker | `healthdrive-tracker` | https://healthdrive-tracker.azurewebsites.net |
| App B — CLM | `healthdrive-clm` | https://healthdrive-clm.azurewebsites.net |

---

## Step 1 — Prepare zip files locally (Windows)

Open PowerShell and run:

```powershell
# App A — Ticket Tracker
Compress-Archive -Path "C:\Users\chandramouli\Downloads\Nat20-main\Nat20-main\healthdrive-ui\index.html",
  "C:\Users\chandramouli\Downloads\Nat20-main\Nat20-main\healthdrive-ui\server.js",
  "C:\Users\chandramouli\Downloads\Nat20-main\Nat20-main\healthdrive-ui\package.json" `
  -DestinationPath "C:\Users\chandramouli\Downloads\healthdrive-tracker.zip" -Force

# App B — CLM
Compress-Archive -Path "C:\Users\chandramouli\Downloads\Nat20-main\Nat20-main\healthdrive-clm\index.html",
  "C:\Users\chandramouli\Downloads\Nat20-main\Nat20-main\healthdrive-clm\server.js",
  "C:\Users\chandramouli\Downloads\Nat20-main\Nat20-main\healthdrive-clm\package.json" `
  -DestinationPath "C:\Users\chandramouli\Downloads\healthdrive-clm.zip" -Force
```

---

## Step 2 — Open Azure Cloud Shell

Go to: https://shell.azure.com
Login with: chandramouli@nousinfo.com

---

## Step 3 — Upload zips to Cloud Shell

In Cloud Shell toolbar click the **↑ Upload** button and upload both:
- `healthdrive-tracker.zip`
- `healthdrive-clm.zip`

---

## Step 4 — Deploy App A (Ticket Tracker)

```bash
# Prepare with node_modules
cd /tmp && rm -rf tracker && mkdir tracker && cd tracker
unzip ~/healthdrive-tracker.zip
npm install
zip -r ~/healthdrive-tracker-full.zip .

# Create App Service
az webapp create \
  --name healthdrive-tracker \
  --resource-group RG-Advantive \
  --plan plan-advantive-one \
  --runtime "NODE:20-lts"

# Configure
az webapp config set \
  --name healthdrive-tracker \
  --resource-group RG-Advantive \
  --web-sockets-enabled true \
  --always-on true \
  --startup-file "node server.js"

az webapp config appsettings set \
  --name healthdrive-tracker \
  --resource-group RG-Advantive \
  --settings NODE_ENV=production PORT=8080 WEBSITES_PORT=8080

# Deploy
az webapp deploy \
  --name healthdrive-tracker \
  --resource-group RG-Advantive \
  --src-path ~/healthdrive-tracker-full.zip \
  --type zip
```

---

## Step 5 — Deploy App B (CLM)

```bash
# Prepare with node_modules
cd /tmp && rm -rf clm && mkdir clm && cd clm
unzip ~/healthdrive-clm.zip
npm install
zip -r ~/healthdrive-clm-full.zip .

# Create App Service
az webapp create \
  --name healthdrive-clm \
  --resource-group RG-Advantive \
  --plan plan-advantive-one \
  --runtime "NODE:20-lts"

# Configure
az webapp config set \
  --name healthdrive-clm \
  --resource-group RG-Advantive \
  --web-sockets-enabled true \
  --always-on true \
  --startup-file "node server.js"

az webapp config appsettings set \
  --name healthdrive-clm \
  --resource-group RG-Advantive \
  --settings NODE_ENV=production PORT=8080 WEBSITES_PORT=8080

# Deploy
az webapp deploy \
  --name healthdrive-clm \
  --resource-group RG-Advantive \
  --src-path ~/healthdrive-clm-full.zip \
  --type zip
```

---

## Step 6 — Verify

```bash
curl https://healthdrive-tracker.azurewebsites.net
curl https://healthdrive-clm.azurewebsites.net
```

Both should return HTML. If not, check logs:
```bash
az webapp log tail --name healthdrive-tracker --resource-group RG-Advantive
az webapp log tail --name healthdrive-clm    --resource-group RG-Advantive
```

---

## Live URLs
| App | URL |
|---|---|
| App A — Ticket Tracker | https://healthdrive-tracker.azurewebsites.net |
| App B — CLM | https://healthdrive-clm.azurewebsites.net |

> Note: `az webapp deploy` polls "Starting the site..." for ~60–90s — this is normal, wait for it.
