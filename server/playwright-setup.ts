import { execSync, exec, execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { glob } from 'glob';

let resolvedBrowserPath: string | null = null;
let installationComplete = false;
let installationInProgress = false;

/**
 * Candidate paths for a system-installed Chromium/Chrome binary.
 * Covers Linux (Replit/NixOS) and Windows (system Chrome + Playwright cache).
 */
const SYSTEM_CHROME_CANDIDATES = [
  // Windows: system Chrome
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  // Linux: system paths
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chromium',
  '/snap/bin/chromium',
];

/**
 * Resolve the browser executable path.
 * 1. Check well-known system paths.
 * 2. Glob the Nix store for a chromium binary (Replit NixOS).
 * 3. Check Playwright's own cache (populated by a prior install).
 * 4. Fall back to letting Playwright use its default (may still fail if cache empty).
 */
function resolveSystemChrome(): string | null {
  // 1. Well-known system paths
  for (const p of SYSTEM_CHROME_CANDIDATES) {
    if (existsSync(p)) {
      return p;
    }
  }

  // 2. Windows: Playwright user cache (~\AppData\Local\ms-playwright\chromium-*\chrome-win64\chrome.exe)
  const winCache = process.env.USERPROFILE || process.env.LOCALAPPDATA?.replace('\\Roaming', '');
  if (winCache && process.platform === 'win32') {
    try {
      const msPlaywrightDir = `${winCache}\\AppData\\Local\\ms-playwright`;
      if (existsSync(msPlaywrightDir)) {
        // Find the highest-numbered chromium-* folder
        const { readdirSync } = require('fs') as typeof import('fs');
        const dirs = readdirSync(msPlaywrightDir)
          .filter((d: string) => d.startsWith('chromium-'))
          .sort()
          .reverse();
        for (const dir of dirs) {
          const exePath = `${msPlaywrightDir}\\${dir}\\chrome-win64\\chrome.exe`;
          if (existsSync(exePath)) return exePath;
          const exePath2 = `${msPlaywrightDir}\\${dir}\\chrome-win\\chrome.exe`;
          if (existsSync(exePath2)) return exePath2;
        }
      }
    } catch {
      // ignore — Playwright will find its own cache automatically
    }
  }

  // 3. NixOS Nix store — find any chromium binary
  try {
    const nixMatches = execSync(
      'find /nix/store -maxdepth 3 -name "chromium" -type f 2>/dev/null | head -1',
      { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    if (nixMatches && existsSync(nixMatches)) {
      return nixMatches;
    }
  } catch {
    // find not available or nix store absent — ignore
  }

  // 4. Linux Playwright cache (if previously installed)
  try {
    const cacheMatches = execSync(
      'find /home/runner/workspace/.cache/ms-playwright -name "chrome" -o -name "headless_shell" 2>/dev/null | head -1',
      { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    if (cacheMatches && existsSync(cacheMatches)) {
      return cacheMatches;
    }
  } catch {
    // cache not present — ignore
  }

  return null;
}

/**
 * Detect and cache the browser executable path on startup.
 * Called once; subsequent calls return the cached value.
 */
export function detectBrowser(): string | null {
  if (resolvedBrowserPath !== undefined && resolvedBrowserPath !== null) {
    return resolvedBrowserPath;
  }
  resolvedBrowserPath = resolveSystemChrome();
  if (resolvedBrowserPath) {
    installationComplete = true;
    console.log(`[Playwright Setup] System browser detected: ${resolvedBrowserPath}`);
  } else {
    console.warn('[Playwright Setup] No system browser found — will attempt background install');
  }
  return resolvedBrowserPath;
}

/**
 * Returns the resolved executable path (or null if not yet found).
 * Pass this to chromium.launch({ executablePath }) to use the system browser.
 */
export function getBrowserExecutablePath(): string | null {
  return resolvedBrowserPath;
}

/**
 * Returns whether a browser is ready to use.
 */
export function isPlaywrightReady(): boolean {
  return installationComplete;
}

/**
 * Returns whether a background install is in progress.
 */
export function isPlaywrightInstalling(): boolean {
  return installationInProgress;
}

/**
 * Start a virtual X display (Xvfb) so that headed Playwright browsers
 * work inside headless Linux containers (Azure App Service, Docker, CI).
 *
 * - Only runs on Linux when no DISPLAY is already set.
 * - Sets process.env.DISPLAY = ':99' so child processes inherit it.
 * - Safe to call multiple times; subsequent calls are no-ops.
 * - Silently skips if Xvfb is not installed (graceful degradation).
 */
let xvfbStarted = false;
export function ensureXvfb(): void {
  if (xvfbStarted) return;
  if (process.platform !== 'linux') return;   // macOS / Windows have real displays
  if (process.env.DISPLAY) return;             // already have a display

  try {
    // Verify Xvfb binary is present
    execFileSync('which', ['Xvfb'], { stdio: 'pipe' });
  } catch {
    console.warn('[Xvfb] Xvfb not found — headed Playwright may fail without a display');
    return;
  }

  try {
    // Kill any stale lock from a previous run
    try { execSync('pkill -f "Xvfb :99"', { stdio: 'pipe' }); } catch { /* none running */ }

    exec('Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset', (err) => {
      if (err && !err.message.includes('already')) {
        console.warn('[Xvfb] Process exited:', err.message);
      }
    });

    // Give Xvfb ~300 ms to create its socket
    execSync('sleep 0.3', { stdio: 'pipe' });

    process.env.DISPLAY = ':99';
    xvfbStarted = true;
    console.log('[Xvfb] Virtual display :99 started (1920x1080x24)');
  } catch (err: any) {
    console.warn('[Xvfb] Could not start virtual display:', err.message);
  }
}

/**
 * Starts Playwright installation in the background as a last resort.
 * Only called when no system browser was detected at startup.
 */
export function startPlaywrightInstallation(): void {
  if (installationComplete || installationInProgress) return;

  // Re-detect in case something changed
  const found = resolveSystemChrome();
  if (found) {
    resolvedBrowserPath = found;
    installationComplete = true;
    console.log(`[Playwright Setup] System browser detected on retry: ${found}`);
    return;
  }

  installationInProgress = true;
  console.log('[Playwright Setup] Attempting to download browser binaries...');

  exec('npx playwright install --with-deps chromium', { timeout: 600000 }, (err, _stdout, stderr) => {
    if (err) {
      console.warn('[Playwright Setup] --with-deps install failed, retrying without system deps...');
      exec('npx playwright install chromium', { timeout: 300000 }, (err2) => {
        installationInProgress = false;
        if (err2) {
          console.error('[Playwright Setup] Browser installation failed:', err2.message);
          if (stderr) console.error('[Playwright Setup] stderr:', stderr.slice(0, 500));
        } else {
          const path = resolveSystemChrome();
          resolvedBrowserPath = path;
          installationComplete = true;
          console.log('[Playwright Setup] Browser binaries installed successfully');
        }
      });
    } else {
      installationInProgress = false;
      const path = resolveSystemChrome();
      resolvedBrowserPath = path;
      installationComplete = true;
      console.log('[Playwright Setup] Browser binaries installed successfully');
    }
  });
}
