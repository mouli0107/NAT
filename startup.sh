#!/bin/bash
set -e
cd /home/site/wwwroot

if [ ! -d "node_modules" ]; then
  echo "[startup] Installing production dependencies (first run only)..."
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --production --ignore-scripts --no-audit 2>&1 | tail -10
  echo "[startup] Install complete."
else
  echo "[startup] node_modules found, skipping install."
fi

echo "[startup] Starting NAT 2.0..."
exec node dist/index.js