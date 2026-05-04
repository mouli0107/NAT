# ─── NAT 2.0 ASTRA — Dockerfile ───────────────────────────────────────────────
# Multi-stage build.
#
# Stage 1 (builder):
#   - Installs ALL deps (including devDeps like @playwright/test)
#   - The postinstall hook automatically downloads Chromium to /root/.cache/ms-playwright/
#   - Runs Vite + esbuild to produce dist/
#
# Stage 2 (runner):
#   - node:20-slim with Chromium system libs installed via apt
#   - Copies dist/ and node_modules (prod only) from builder
#   - Copies the already-downloaded Chromium from builder (no re-download needed)
#   - PLAYWRIGHT_BROWSERS_PATH points to the copied Chromium location

# ── Stage 1: Build + Download Chromium ────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
# Full install: devDeps included so @playwright/test is present.
# The postinstall hook runs "npx playwright install chromium" and downloads
# Chromium to /root/.cache/ms-playwright/ — we'll copy this to the runner.
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Chromium system dependencies (required by Playwright's bundled Chromium binary)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libexpat1 \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Tell Playwright where to find the browsers we copy below
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install production node_modules only.
# --ignore-scripts prevents the postinstall from trying "npx playwright install chromium"
# again (it would fail since @playwright/test is excluded by --omit=dev).
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built frontend + server from builder
COPY --from=builder /app/dist ./dist

# Copy the Chromium that was already downloaded during builder's npm ci.
# This avoids any re-download or playwright binary dependency in the runner.
COPY --from=builder /root/.cache/ms-playwright /ms-playwright

# Runtime directories the app writes to at runtime
RUN mkdir -p projects recorder-data screenshots test-results

# Azure App Service injects PORT automatically; fallback to 5000 locally
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5000}/api/health || exit 1

CMD ["node", "dist/index.js"]
