import { execSync, exec, execFileSync } from 'child_process';
// Static imports only: the server is bundled as ESM, where require() is not
// defined. The previous require('fs') here sat in a Windows-only branch, so it
// never threw on Linux, but it would have the moment that branch ran.
import { existsSync, readdirSync } from 'fs';
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
  // macOS: system Chrome
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // Linux: system paths. /opt/google/chrome is where a real Google Chrome
  // package installs, and is the path Playwright's `channel: 'chrome'` looks
  // for, so probing it here lets us use it when it genuinely exists.
  '/opt/google/chrome/chrome',
  '/opt/google/chrome/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chromium',
  '/snap/bin/chromium',
];

/**
 * Directories that may hold a Playwright-managed browser download.
 * PLAYWRIGHT_BROWSERS_PATH is what the Docker image sets (/ms-playwright), so it
 * is checked first. The previous implementation only probed a hardcoded Replit
 * path, which meant the container's own Chromium was never found.
 */
function playwrightCacheDirs(): string[] {
  const dirs: string[] = [];
  const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (envPath && envPath !== '0') dirs.push(envPath);
  dirs.push('/ms-playwright');
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    dirs.push(`${home}/.cache/ms-playwright`);
    dirs.push(`${home}\\AppData\\Local\\ms-playwright`);
  }
  dirs.push('/root/.cache/ms-playwright');
  dirs.push('/home/runner/workspace/.cache/ms-playwright');
  return dirs;
}

/** Binary layouts Playwright uses inside a chromium-* download folder. */
const CHROMIUM_BINARY_SUFFIXES = [
  'chrome-linux/chrome',
  'chrome-linux64/chrome',
  'chrome-linux/headless_shell',
  'chrome-headless-shell-linux64/chrome-headless-shell',
  'chrome-win64\\chrome.exe',
  'chrome-win\\chrome.exe',
  'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
];

/**
 * Find a Chromium binary that Playwright previously downloaded, on any platform.
 * Returns null when no cache directory holds one.
 */
export function resolvePlaywrightCache(): string | null {
  for (const dir of playwrightCacheDirs()) {
    let entries: string[];
    try {
      if (!existsSync(dir)) continue;
      entries = readdirSync(dir).filter((d: string) => d.startsWith('chromium')).sort().reverse();
    } catch {
      continue;
    }
    for (const entry of entries) {
      for (const suffix of CHROMIUM_BINARY_SUFFIXES) {
        const sep = suffix.includes('\\') ? '\\' : '/';
        const candidate = `${dir}${sep}${entry}${sep}${suffix}`;
        try {
          if (existsSync(candidate)) return candidate;
        } catch {
          // unreadable path — keep looking
        }
      }
    }
  }
  return null;
}

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

  // 2. Playwright's own download cache, on any platform (covers the container's
  //    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright as well as local dev caches).
  const cached = resolvePlaywrightCache();
  if (cached) return cached;

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

  return null;
}

/**
 * A REAL Google Chrome / Chromium install (not a Playwright download), if one
 * exists on this machine. Used only to make a headed window look familiar on a
 * developer desktop; never required.
 */
export function findRealChrome(): string | null {
  for (const p of SYSTEM_CHROME_CANDIDATES) {
    try {
      if (existsSync(p)) return p;
    } catch {
      // unreadable path — keep looking
    }
  }
  return null;
}

/**
 * Whether a browser window should actually be opened.
 *
 * A desktop OS defaults to headed so the operator can watch a crawl. A server
 * (Azure App Service, Docker, CI) has nobody watching, so it defaults to
 * headless; the crawl is streamed to the UI over SSE regardless. Headed can
 * still be forced there with AUTOTEST_HEADED=true, but only once a display
 * exists, which ensureXvfb() provides.
 */
export function shouldRunHeaded(): boolean {
  const flag = process.env.AUTOTEST_HEADED;
  const isDesktop = process.platform === 'win32' || process.platform === 'darwin';

  if (isDesktop) return flag !== 'false';
  if (flag !== 'true') return false;

  if (!process.env.DISPLAY) {
    console.warn('[Playwright Setup] AUTOTEST_HEADED=true but no DISPLAY is set — running headless');
    return false;
  }
  return true;
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
