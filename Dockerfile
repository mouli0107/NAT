# ─── NAT 2.0 ASTRA — Dockerfile ───────────────────────────────────────────────
# Multi-stage build.
# Stage 1 (builder): compile React frontend + bundle Express server
# Stage 2 (runner):  node:20-slim + chromium system deps + playwright + app
#
# WHY node:20-slim not node:20-alpine:
#   Alpine uses musl libc. Chromium requires glibc system libraries
#   (libnss3, libatk, libdrm, etc.) that are only available on Debian/Ubuntu.
#
# WHY playwright install is in the runner (not builder):
#   Browsers must be present in the final image that actually runs the server.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

COPY . .

ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm run build

# ── Stage 2: Production runner with Playwright + Chromium ─────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Chromium system dependencies (required by Playwright's bundled Chromium)
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
# Store browsers inside the image (persists, no re-download on restart)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install production dependencies
COPY package*.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev && npm cache clean --force

# Download Playwright's Chromium binary into the image
# System deps are already installed above, so we skip --with-deps
RUN npx playwright install chromium

# Copy built frontend + bundled server from builder stage
COPY --from=builder /app/dist ./dist

# Runtime directories the app writes to
RUN mkdir -p projects recorder-data screenshots test-results

# Azure App Service sets PORT automatically; fallback to 5000 locally
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5000}/api/health || exit 1

CMD ["node", "dist/index.js"]
