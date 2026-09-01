import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ─── Cache root ───────────────────────────────────────────────────────────────
// On Azure App Service, set CODELENS_CACHE_PATH to /home/codelens-cache
// (persistent storage mount, survives restarts and deployments).
// Locally it defaults to <project-root>/.codelens-cache.

const CACHE_ROOT =
  process.env.CODELENS_CACHE_PATH ??
  path.join(process.cwd(), '.codelens-cache');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cacheKey(repoUrl: string, branch: string, userId: string): string {
  // Per-user so two users reviewing the same repo+branch don't share a working
  // tree (concurrent reset/commit would corrupt each other's in-progress fixes).
  return Buffer.from(`${userId}::${repoUrl}::${branch}`)
    .toString('base64')
    .replace(/[/+=]/g, '_')
    .substring(0, 80);
}

function repoLocalPath(repoUrl: string, branch: string, userId: string): string {
  return path.join(CACHE_ROOT, cacheKey(repoUrl, branch, userId));
}

/** Remove any embedded credentials (user:pass@) from a git URL.
 *  Used as a stable, PAT-free key for DB storage and resume lookup. */
export function stripGitCredentials(url: string): string {
  try {
    const u = new URL(url);
    u.username = '';
    u.password = '';
    return u.toString();
  } catch {
    return url;
  }
}

export function buildAuthenticatedUrl(repoUrl: string, pat: string): string {
  if (!pat) return repoUrl;
  try {
    const url = new URL(repoUrl);
    if (url.hostname.includes('dev.azure.com') || url.hostname.includes('visualstudio.com')) {
      url.username = 'anything';
      url.password = encodeURIComponent(pat);
    } else if (url.hostname.includes('github.com')) {
      url.username = pat;
      url.password = 'x-oauth-basic';
    } else {
      url.username = 'oauth2';
      url.password = encodeURIComponent(pat);
    }
    return url.toString();
  } catch {
    return repoUrl;
  }
}

// ─── Main: clone once, fetch on rerun (fully async — never blocks event loop) ─

export interface RepoReadyResult {
  localPath: string;
  isNew: boolean;
  commitHash: string;
}

// Git flag to unlock Windows MAX_PATH (260-char) limit.
// Required for repos with deep folder structures (e.g. insurity-eais-backend).
const LONGPATHS_FLAG = '-c core.longpaths=true';

/** Delete a directory tree, swallowing errors (best-effort cleanup). */
function rmDir(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

export async function ensureRepoReady(
  repoUrl: string,
  branch: string,
  authenticatedUrl: string,
  userId = 'anonymous',
): Promise<RepoReadyResult> {
  if (!fs.existsSync(CACHE_ROOT)) {
    fs.mkdirSync(CACHE_ROOT, { recursive: true });
  }

  const localPath = repoLocalPath(repoUrl, branch, userId);
  const gitDir = path.join(localPath, '.git');

  if (fs.existsSync(gitDir)) {
    // ── Subsequent run: fetch + reset to latest ───────────────────────────────
    console.log(`[git] Fetching latest — ${repoUrl} @ ${branch}`);
    try {
      await execAsync(`git ${LONGPATHS_FLAG} remote set-url origin "${authenticatedUrl}"`, {
        cwd: localPath,
      });
      await execAsync(`git ${LONGPATHS_FLAG} fetch --depth 1 origin "${branch}"`, {
        cwd: localPath,
        timeout: 120_000,
      });
      await execAsync(`git ${LONGPATHS_FLAG} checkout "${branch}"`, { cwd: localPath });
      await execAsync(`git ${LONGPATHS_FLAG} reset --hard "origin/${branch}"`, { cwd: localPath });
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: localPath });
      return { localPath, isNew: false, commitHash: stdout.trim() };
    } catch (err: any) {
      // Any failure (longpaths, partial checkout, network) → delete stale cache and re-clone.
      // A partial working tree would cause the folder filter to silently return 0 files,
      // which is worse than a fresh clone.
      console.warn(`[git] Fetch/checkout failed — purging stale cache and re-cloning: ${err?.message?.split('\n')[0]}`);
      rmDir(localPath);
      // Fall through to fresh clone below
    }
  }

  // ── First run (or re-clone after empty cache purge) ───────────────────────
  console.log(`[git] Cloning — ${repoUrl} @ ${branch}`);
  fs.mkdirSync(localPath, { recursive: true });
  const branchArg = branch ? `--branch "${branch}"` : '';
  await execAsync(
    `git ${LONGPATHS_FLAG} clone --depth 1 ${branchArg} --single-branch "${authenticatedUrl}" .`,
    { cwd: localPath, timeout: 300_000 },
  );

  const { stdout } = await execAsync('git rev-parse HEAD', { cwd: localPath });
  return { localPath, isNew: true, commitHash: stdout.trim() };
}

// ─── Fix branch: commit fixes to a dedicated branch, never the base branch ────
//
// Fixes are committed to a stable branch named `astra-codelens/fixes-<base>`.
// Using a stable name (per base branch) means a later session reuses the SAME
// branch — prior fixes are already there, so the user resumes where they left
// off. The base branch is never modified.

function slug(s: string): string {
  return (s || '')
    .replace(/[^A-Za-z0-9._\/-]/g, '-')
    .replace(/\/+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Build a valid, stable, PER-USER git branch name for fixes. Per-user so two
 *  people fixing the same repo never push to / overwrite the same branch. */
export function fixBranchName(baseBranch: string, userId = 'anonymous'): string {
  const base = slug(baseBranch) || 'main';
  const user = slug(userId) || 'anon';
  return `astra-codelens/fixes-${base}-${user}`;
}

/**
 * Ensure the fix branch exists and is checked out.
 * - If it already exists (local or remote), check it out.
 * - Otherwise create it from the current HEAD of the base branch.
 * Returns the fix branch name.
 */
export async function ensureFixBranch(localPath: string, baseBranch: string, userId = 'anonymous'): Promise<string> {
  const branch = fixBranchName(baseBranch, userId);

  // Already on it?
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: localPath });
    if (stdout.trim() === branch) return branch;
  } catch { /* ignore */ }

  // Local branch exists?
  try {
    await execAsync(`git ${LONGPATHS_FLAG} rev-parse --verify "${branch}"`, { cwd: localPath });
    await execAsync(`git ${LONGPATHS_FLAG} checkout "${branch}"`, { cwd: localPath });
    return branch;
  } catch { /* not local — try remote, else create */ }

  // Remote branch exists? (a previous session pushed it)
  try {
    await execAsync(`git ${LONGPATHS_FLAG} fetch --depth 1 origin "${branch}"`, {
      cwd: localPath,
      timeout: 120_000,
    });
    await execAsync(`git ${LONGPATHS_FLAG} checkout -b "${branch}" "origin/${branch}"`, { cwd: localPath });
    return branch;
  } catch { /* no remote branch — create fresh from current HEAD */ }

  await execAsync(`git ${LONGPATHS_FLAG} checkout -b "${branch}"`, { cwd: localPath });
  return branch;
}

/** Stage and commit a single fixed file on the current (fix) branch. Returns the commit hash, or null if nothing changed. */
export async function commitFixedFile(
  localPath: string,
  relativePath: string,
  message: string,
): Promise<string | null> {
  // Ensure a git identity exists (server clones often have none)
  await execAsync('git config user.email "astra-codelens@nous.local"', { cwd: localPath }).catch(() => {});
  await execAsync('git config user.name "ASTRA Code Lens"', { cwd: localPath }).catch(() => {});

  await execAsync(`git ${LONGPATHS_FLAG} add -- "${relativePath}"`, { cwd: localPath });

  // Nothing staged → file content was already identical; skip commit
  try {
    await execAsync('git diff --cached --quiet', { cwd: localPath });
    return null; // exit 0 = no staged changes
  } catch { /* exit 1 = there are staged changes, proceed to commit */ }

  // Use a temp file for the message to avoid shell-quoting issues
  const msgFile = path.join(localPath, '.git', `COMMIT_MSG_${process.pid}_${Math.round(performance.now())}.tmp`);
  fs.writeFileSync(msgFile, message, 'utf-8');
  try {
    await execAsync(`git ${LONGPATHS_FLAG} commit -F "${msgFile}"`, { cwd: localPath });
  } finally {
    try { fs.unlinkSync(msgFile); } catch { /* ignore */ }
  }

  const { stdout } = await execAsync('git rev-parse HEAD', { cwd: localPath });
  return stdout.trim();
}

/** Push the fix branch to origin (Azure DevOps / GitHub). Sets upstream. */
export async function pushFixBranch(
  localPath: string,
  authenticatedUrl: string,
  fixBranch: string,
): Promise<void> {
  await execAsync(`git ${LONGPATHS_FLAG} remote set-url origin "${authenticatedUrl}"`, { cwd: localPath });
  await execAsync(`git ${LONGPATHS_FLAG} push -u origin "${fixBranch}"`, {
    cwd: localPath,
    timeout: 180_000,
  });
}

// ─── File listing via git ls-files ───────────────────────────────────────────
// git ls-files only returns tracked files — bin/, obj/, .vs/ are in .gitignore
// so they never appear here. Much faster than an fs.walk on large repos.

export async function listTrackedFiles(localPath: string): Promise<string[]> {
  // No shell glob patterns — list ALL tracked files and filter in JS.
  // Shell quoting of globs behaves differently on Windows vs Linux.
  const { stdout } = await execAsync('git ls-files', {
    cwd: localPath,
    timeout: 30_000,
  });
  return stdout
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      const lower = l.toLowerCase();
      return lower.endsWith('.cs') || lower.endsWith('.csproj') || lower === 'appsettings.json';
    });
}

/** For a PR review: return the added/modified line ranges per changed file, by
 *  diffing the (already-cloned) source branch HEAD against the target branch.
 *  Repo-relative path (slash-normalized) → array of [startLine, endLine] on the
 *  HEAD side. Returns an empty map if the diff cannot be computed (caller then
 *  falls back to whole-file comments rather than dropping everything). */
export async function getChangedLineRanges(
  localPath: string,
  targetBranch: string,
  authenticatedUrl: string,
): Promise<Map<string, Array<[number, number]>>> {
  const ranges = new Map<string, Array<[number, number]>>();

  // Bring the target branch into the shallow clone so we can diff against it.
  try {
    await execAsync(`git ${LONGPATHS_FLAG} remote set-url origin "${authenticatedUrl}"`, { cwd: localPath }).catch(() => {});
    await execAsync(`git ${LONGPATHS_FLAG} fetch --depth 50 origin "${targetBranch}"`, {
      cwd: localPath, timeout: 120_000,
    });
  } catch {
    return ranges; // no target available — caller falls back to whole-file
  }

  // Prefer three-dot (changes since the branches diverged); fall back to two-dot
  // if the merge-base is unreachable in a shallow clone.
  let out = '';
  for (const spec of [`"origin/${targetBranch}...HEAD"`, `"origin/${targetBranch}" HEAD`]) {
    try {
      const r = await execAsync(
        `git ${LONGPATHS_FLAG} diff --unified=0 --no-color ${spec}`,
        { cwd: localPath, maxBuffer: 50 * 1024 * 1024 },
      );
      out = r.stdout;
      break;
    } catch { /* try next spec */ }
  }
  if (!out) return ranges;

  // Parse the unified diff. Track the current file from '+++ b/<path>' and the
  // added/modified line ranges from each hunk header '@@ -a,b +c,d @@'.
  let current: string | null = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).trim();
      current = p === '/dev/null' ? null : p.replace(/^b\//, '').replace(/\\/g, '/');
      if (current && !ranges.has(current)) ranges.set(current, []);
    } else if (line.startsWith('@@') && current) {
      const m = /\+(\d+)(?:,(\d+))?/.exec(line);
      if (m) {
        const start = Number(m[1]);
        const count = m[2] === undefined ? 1 : Number(m[2]);
        if (count > 0) ranges.get(current)!.push([start, start + count - 1]);
      }
    }
  }
  return ranges;
}
