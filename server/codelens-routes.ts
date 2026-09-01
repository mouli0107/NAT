import { Router } from 'express';
import { randomUUID } from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Request, Response } from 'express';
import { createSession, getSession, attachClient, detachClient } from './codelens-session';
import type { CodeLensSession } from './codelens-types';
import {
  runReview,
  resumeReview,
  generateFix,
  applyFix,
  pushFixes,
  bulkFixByStandard,
  resumeFixing,
  retryCoverage,
  checkFileAgainstStandard,
  buildAuthenticatedUrl,
  stripGitCredentials,
  suppressionKey,
  STANDARDS,
  parseStandardsDocument,
} from './codelens-agent';
import { parseIgnoreFileContent } from './codelens-ignore';
import { getAuthContext } from './auth-middleware';
import {
  parseAzurePrUrl,
  repoCloneUrl,
  getPullRequest,
  getPullRequestChangedFiles,
  postPullRequestThread,
} from './codelens-azure-pr';
import type { PrContext, ViolationRecord } from './codelens-types';
// codelens-db is loaded lazily inside each history route so that this module
// can load even when DATABASE_URL is absent (e.g. local dev without a DB).
async function db() {
  return import('./codelens-db');
}

const execAsync = promisify(exec);
export const codeLensRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a live session and verify the requester owns it.
 *  Returns the session only when it exists AND belongs to the caller.
 *  A not-found and a not-owned session are indistinguishable to the caller
 *  (both yield `null`) so we never leak the existence of another user's session. */
async function getOwnedSession(
  req: Request,
  sessionId: string | undefined,
): Promise<CodeLensSession | null> {
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  const { userId } = await getAuthContext(req);
  return session.userId === userId ? session : null;
}

/** Guess a fenced-code language hint from a file extension (best-effort). */
function langForFile(file: string): string {
  const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase();
  const map: Record<string, string> = {
    cs: 'csharp', ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx', java: 'java',
    py: 'python', sql: 'sql', json: 'json', xml: 'xml', html: 'html',
    css: 'css', yml: 'yaml', yaml: 'yaml', sh: 'bash', go: 'go', rb: 'ruby',
  };
  return map[ext] ?? '';
}

/** Format a "line 42" / "lines 42-45" / "file-level" location label. */
function lineLabel(v: ViolationRecord): string {
  if (v.lineStart > 0) {
    return v.lineEnd > v.lineStart ? `lines ${v.lineStart}-${v.lineEnd}` : `line ${v.lineStart}`;
  }
  return 'file-level';
}

/** Render the offending code as a fenced block, trimmed to a sane size, using a
 *  fence that will not collide with backticks already in the snippet. */
function codeBlock(file: string, foundCode: string): string[] {
  let code = (foundCode ?? '').replace(/\r\n/g, '\n').trimEnd();
  if (!code) return [];
  const lines = code.split('\n');
  if (lines.length > 12) code = lines.slice(0, 12).join('\n') + '\n… (truncated)';
  else if (code.length > 800) code = code.slice(0, 800) + '\n… (truncated)';
  const fence = code.includes('```') ? '~~~' : '```';
  return [`${fence}${langForFile(file)}`, code, fence];
}

/** Build the markdown body for the single summary comment posted to a PR.
 *  Each comment is self-contained: file, line, the offending code, and the fix,
 *  numbered so a reviewer can reference "comment 3". Grouped by file, most
 *  severe first. */
function buildPrCommentMarkdown(
  selected: ViolationRecord[],
  fileIndex: Map<string, string>,
  pr: PrContext,
  commitHash: string,
): string {
  const rank = (s: string) => (s === 'Critical' ? 0 : s === 'Warning' ? 1 : 2);
  const icon = (s: string) => (s === 'Critical' ? '🔴' : s === 'Warning' ? '🟠' : '🔵');

  const byFile = new Map<string, ViolationRecord[]>();
  for (const v of selected) {
    const p = fileIndex.get(v.fileId) ?? v.fileId;
    const list = byFile.get(p);
    if (list) list.push(v); else byFile.set(p, [v]);
  }
  // Files with the most severe finding first, then alphabetical.
  const files = Array.from(byFile.entries()).sort((a, b) => {
    const sa = Math.min(...a[1].map(v => rank(v.severity)));
    const sb = Math.min(...b[1].map(v => rank(v.severity)));
    return sa - sb || a[0].localeCompare(b[0]);
  });

  const crit = selected.filter(v => v.severity === 'Critical').length;
  const warn = selected.filter(v => v.severity === 'Warning').length;
  const info = selected.filter(v => v.severity === 'Info').length;

  const out: string[] = [];
  out.push('## ASTRA Code Lens review');
  out.push('');
  out.push(
    `${selected.length} comment(s) on PR #${pr.pullRequestId} against the Insurity coding standards: ` +
    `${crit} Critical, ${warn} Warning, ${info} Info.`,
  );
  const shortCommit = commitHash ? commitHash.slice(0, 8) : '';
  out.push(
    `Reviewed source: \`${pr.sourceBranch}\`` +
    (shortCommit ? ` @ \`${shortCommit}\`` : '') +
    ` (line numbers refer to this revision).`,
  );
  out.push('');

  let n = 0;
  for (const [file, list] of files) {
    list.sort((a, b) => rank(a.severity) - rank(b.severity) || a.lineStart - b.lineStart);
    out.push(`### \`${file}\``);
    out.push('');
    for (const v of list) {
      n += 1;
      out.push(`**${n}. ${icon(v.severity)} ${v.severity}: ${v.ruleName}** — ${lineLabel(v)}`);
      out.push('');
      const block = codeBlock(file, v.foundCode);
      if (block.length) { out.push(...block); out.push(''); }
      if (v.recommendedFix) { out.push(`Recommendation: ${v.recommendedFix}`); out.push(''); }
    }
  }

  out.push('_Posted by ASTRA Code Lens._');
  return out.join('\n');
}

/** Strip characters that are never valid in a git branch name but often appear
 *  due to copy-paste from markdown, IDE tooltips, or autocorrect:
 *  backticks, leading/trailing single/double quotes, angle brackets. */
function sanitizeBranch(raw: string): string {
  return raw
    .replace(/`/g, '')               // backticks from markdown
    .replace(/^['"]|['"]$/g, '')     // leading/trailing quotes
    .replace(/[<>]/g, '')            // angle brackets
    .trim();
}

// ─── Browse cache (reuse shallow clones for ≤10 min) ─────────────────────────

interface BrowseCache { localPath: string; timestamp: number }
const browseCache = new Map<string, BrowseCache>();
const BROWSE_TTL = 10 * 60 * 1000;

async function getOrCloneForBrowse(repoUrl: string, branch: string, pat: string): Promise<string> {
  const cleanBranch = sanitizeBranch(branch);
  const key = `${repoUrl}::${cleanBranch}`;
  const cached = browseCache.get(key);
  if (cached && Date.now() - cached.timestamp < BROWSE_TTL) {
    return cached.localPath;
  }

  const localPath = path.join(os.tmpdir(), 'codelens-browse', randomUUID().slice(0, 8));
  fs.mkdirSync(localPath, { recursive: true });

  const authUrl = buildAuthenticatedUrl(repoUrl, pat);
  const branchArg = cleanBranch ? `--branch "${cleanBranch}"` : '';
  // No-checkout treeless clone — only downloads tree metadata, not file blobs
  await execAsync(
    `git clone --depth 1 --filter=blob:none --no-checkout ${branchArg} "${authUrl}" "${localPath}"`,
    { timeout: 90_000 },
  );

  browseCache.set(key, { localPath, timestamp: Date.now() });
  return localPath;
}

function gitLsTree(localPath: string, subPath = ''): Promise<string[]> {
  // To list a directory's CHILDREN, git needs the pathspec to end in a slash.
  // Without it, `ls-tree -d HEAD -- "server"` returns the entry "server" itself
  // (one line) instead of its contents — which downstream turned into phantom
  // paths like "server/server" and broke folder selection. With the trailing
  // slash, output lines are already FULL root-relative child paths (e.g.
  // "server/lib"). The no-subPath (top-level) case is left untouched.
  const norm = subPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const pathArg = norm ? `-- "${norm}/"` : '';
  return execAsync(
    `git -C "${localPath}" ls-tree -d --name-only HEAD ${pathArg}`,
    { timeout: 15_000 },
  ).then(({ stdout }) =>
    stdout.split('\n').map(l => l.trim()).filter(Boolean),
  );
}

/** Last path segment of a root-relative git path (always '/'-separated). */
function baseSegment(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() ?? p;
}

function gitLsFiles(localPath: string, subPath = ''): Promise<string[]> {
  const pathArg = subPath ? `-- "${subPath}"` : '';
  return execAsync(
    `git -C "${localPath}" ls-tree -r --name-only HEAD ${pathArg}`,
    { timeout: 15_000 },
  ).then(({ stdout }) =>
    stdout.split('\n').map(l => l.trim()).filter(l => l.endsWith('.cs')),
  );
}

// ─── POST /review/start ───────────────────────────────────────────────────────

codeLensRouter.post('/review/start', async (req: Request, res: Response) => {
  const { repoUrl, branch = '', pat = '', folders = [], ignorePatterns = [] } = req.body as {
    repoUrl?: string; branch?: string; pat?: string;
    folders?: string[]; ignorePatterns?: string[];
  };

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'repoUrl (string) is required' });
  }

  const sessionId = `cls-${randomUUID().slice(0, 8)}`;
  const localPath = path.join(os.tmpdir(), 'codelens', sessionId);
  fs.mkdirSync(localPath, { recursive: true });

  // Sanitize branch — strip backticks, stray quotes, etc. from copy-paste artifacts
  const cleanBranch = sanitizeBranch(branch.trim());

  // Embed PAT into the URL so the agent clone command works
  const authUrl = buildAuthenticatedUrl(repoUrl.trim(), pat.trim());

  const { userId } = await getAuthContext(req);
  const session = createSession(
    sessionId,
    authUrl,
    cleanBranch,
    localPath,
    Array.isArray(folders) ? folders : [],
    Array.isArray(ignorePatterns) ? ignorePatterns : [],
    userId,
  );

  setTimeout(() => {
    runReview(session).catch(err =>
      console.error(`[CodeLens] Unhandled review error for ${sessionId}:`, err),
    );
  }, 600);

  return res.status(202).json({
    sessionId,
    streamUrl: `/api/v1/codelens/review/stream?sessionId=${sessionId}`,
  });
});

// ─── POST /pr/review ──────────────────────────────────────────────────────────
// Review an Azure DevOps pull request against the Code Lens standards catalog.
// Parses the PR URL, reads the PR (source/target branch) + its changed files,
// then runs the normal review engine scoped to just those files.

codeLensRouter.post('/pr/review', async (req: Request, res: Response) => {
  const { prUrl = '', pat = '', ignorePatterns = [] } = req.body as {
    prUrl?: string; pat?: string; ignorePatterns?: string[];
  };

  if (!prUrl || typeof prUrl !== 'string') {
    return res.status(400).json({ error: 'prUrl (string) is required' });
  }
  const ref = parseAzurePrUrl(prUrl);
  if (!ref) {
    return res.status(400).json({
      error: 'Could not parse the Azure DevOps PR URL. Expected a form like ' +
        'https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}',
    });
  }
  if (!pat || typeof pat !== 'string') {
    return res.status(400).json({ error: 'A Personal Access Token (pat) is required to read the PR and post comments.' });
  }

  // Read PR metadata + changed files up front so we can fail fast with a clear
  // message (bad URL, bad PAT, no changes) before spinning up a review session.
  let pr, changedFiles: string[];
  try {
    pr = await getPullRequest(ref, pat.trim());
    changedFiles = await getPullRequestChangedFiles(ref, pat.trim());
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? 'Failed to read the pull request from Azure DevOps.' });
  }
  if (changedFiles.length === 0) {
    return res.status(422).json({ error: 'This PR has no reviewable file changes (only deletes or folders were found).' });
  }

  const sessionId = `cls-${randomUUID().slice(0, 8)}`;
  const localPath = path.join(os.tmpdir(), 'codelens', sessionId);
  fs.mkdirSync(localPath, { recursive: true });

  const authUrl = buildAuthenticatedUrl(repoCloneUrl(ref), pat.trim());
  const { userId } = await getAuthContext(req);
  const session = createSession(
    sessionId,
    authUrl,
    pr.sourceBranch,
    localPath,
    [],
    Array.isArray(ignorePatterns) ? ignorePatterns : [],
    userId,
  );
  session.changedFilesFilter = changedFiles;
  session.prContext = {
    provider: 'azure',
    org: ref.org,
    project: ref.project,
    repo: ref.repo,
    pullRequestId: ref.pullRequestId,
    apiBase: ref.apiBase,
    webUrl: ref.webUrl,
    title: pr.title,
    sourceBranch: pr.sourceBranch,
    targetBranch: pr.targetBranch,
  };

  setTimeout(() => {
    runReview(session).catch(err =>
      console.error(`[CodeLens] Unhandled PR review error for ${sessionId}:`, err),
    );
  }, 600);

  return res.status(202).json({
    sessionId,
    streamUrl: `/api/v1/codelens/review/stream?sessionId=${sessionId}`,
    pr: {
      id: ref.pullRequestId,
      title: pr.title,
      sourceBranch: pr.sourceBranch,
      targetBranch: pr.targetBranch,
      changedFiles: changedFiles.length,
      webUrl: ref.webUrl,
    },
  });
});

// ─── POST /pr/comment/preview ─────────────────────────────────────────────────
// Return the exact markdown that would be posted (for "Copy all to clipboard"),
// without posting anything and without needing a PAT. Empty violationIds ⇒ all.

codeLensRouter.post('/pr/comment/preview', async (req: Request, res: Response) => {
  const { sessionId, violationIds } = req.body as { sessionId?: string; violationIds?: string[] };
  const session = await getOwnedSession(req, sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or not owned by caller.' });
  if (!session.prContext) return res.status(400).json({ error: 'This session is not a pull-request review.' });

  const ids = Array.isArray(violationIds) && violationIds.length
    ? violationIds
    : Array.from(session.violations.keys());
  const selected = ids
    .map(id => session.violations.get(id))
    .filter((v): v is ViolationRecord => !!v);

  const fileIndex = new Map(session.files.map(f => [f.fileId, f.relativePath]));
  const markdown = selected.length
    ? buildPrCommentMarkdown(selected, fileIndex, session.prContext, session.commitHash)
    : '';
  return res.json({ markdown, count: selected.length });
});

// ─── POST /pr/comment ─────────────────────────────────────────────────────────
// Post the user-selected review comments as a single summary comment thread on
// the PR. The PAT is re-supplied by the client (never stored server-side).

codeLensRouter.post('/pr/comment', async (req: Request, res: Response) => {
  const { sessionId, pat = '', violationIds = [] } = req.body as {
    sessionId?: string; pat?: string; violationIds?: string[];
  };

  const session = await getOwnedSession(req, sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or not owned by caller.' });
  if (!session.prContext) return res.status(400).json({ error: 'This session is not a pull-request review.' });
  if (!pat || typeof pat !== 'string') {
    return res.status(400).json({ error: 'A Personal Access Token (pat) is required to post the comment.' });
  }
  if (!Array.isArray(violationIds) || violationIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one comment to add to the PR.' });
  }

  const selected = violationIds
    .map(id => session.violations.get(id))
    .filter((v): v is ViolationRecord => !!v);
  if (selected.length === 0) {
    return res.status(400).json({ error: 'None of the selected comments were found in this session.' });
  }

  const fileIndex = new Map(session.files.map(f => [f.fileId, f.relativePath]));
  const markdown = buildPrCommentMarkdown(selected, fileIndex, session.prContext, session.commitHash);

  try {
    const { threadId } = await postPullRequestThread(session.prContext, pat.trim(), markdown);
    return res.json({ posted: selected.length, threadId, webUrl: session.prContext.webUrl });
  } catch (err: any) {
    return res.status(502).json({ error: err?.message ?? 'Failed to post the comment to Azure DevOps.' });
  }
});

// ─── GET /review/exists ───────────────────────────────────────────────────────
// Cheap probe so the client can tell "session gone" (server restart / TTL purge)
// from a transient stream drop, and stop reconnecting forever.

codeLensRouter.get('/review/exists', async (req: Request, res: Response) => {
  const { sessionId } = req.query as { sessionId?: string };
  // Owner-scoped: only report existence of a session the caller owns, so a
  // restart/TTL purge is reported truthfully without leaking others' sessions.
  const session = await getOwnedSession(req, sessionId);
  return res.json({ exists: !!session });
});

// ─── GET /review/stream ───────────────────────────────────────────────────────

codeLensRouter.get('/review/stream', async (req: Request, res: Response) => {
  const { sessionId } = req.query as { sessionId?: string };
  if (!sessionId) return res.status(400).json({ error: 'sessionId query parameter is required' });

  const session = await getOwnedSession(req, sessionId);
  if (!session) return res.status(404).json({ error: `Session ${sessionId} not found` });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  attachClient(session, res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    detachClient(session, res);
  });
});

// ─── POST /review/stop ────────────────────────────────────────────────────────

codeLensRouter.post('/review/stop', async (req: Request, res: Response) => {
  const { session_id } = req.body as { session_id?: string };
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  if (session.status !== 'running') {
    return res.status(400).json({ error: `Session is ${session.status}, not running` });
  }

  session.status = 'stopped';
  return res.json({
    status: 'stopped',
    files_reviewed: session.lastReviewedFileIndex,
    files_remaining: session.totalFiles - session.lastReviewedFileIndex,
  });
});

// ─── POST /review/resume ──────────────────────────────────────────────────────

codeLensRouter.post('/review/resume', async (req: Request, res: Response) => {
  const { session_id } = req.body as { session_id?: string };
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  if (session.status !== 'stopped') {
    return res.status(400).json({ error: `Session is ${session.status}, not stopped` });
  }

  res.json({ status: 'resuming', resuming_from_index: session.lastReviewedFileIndex });

  resumeReview(session).catch(err =>
    console.error(`[CodeLens] Resume error for ${session_id}:`, err),
  );
});

// ─── POST /review/retry-coverage ──────────────────────────────────────────────
// Re-run the (file, standard) checks that didn't complete (hard fail-closed).

codeLensRouter.post('/review/retry-coverage', async (req: Request, res: Response) => {
  const { session_id } = req.body as { session_id?: string };
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  const retrying = session.coverageErrors.size;
  res.status(202).json({ status: 'retrying', retrying });

  retryCoverage(session).catch(err =>
    console.error(`[CodeLens] retryCoverage error for ${session_id}:`, err),
  );
});

// ─── POST /fix/resume ─────────────────────────────────────────────────────────
// Resume FIXING from a prior run's persisted open violations (no full re-review).
// Creates a fresh session, loads the latest resumable run from the DB, clones the
// repo, checks out the existing fix branch, and streams the open violations.

codeLensRouter.post('/fix/resume', async (req: Request, res: Response) => {
  const { repoUrl, branch = '', pat = '' } = req.body as {
    repoUrl?: string; branch?: string; pat?: string;
  };
  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'repoUrl (string) is required' });
  }

  const sessionId = `cls-${randomUUID().slice(0, 8)}`;
  const localPath = path.join(os.tmpdir(), 'codelens', sessionId);
  fs.mkdirSync(localPath, { recursive: true });

  const cleanBranch = sanitizeBranch(branch.trim());
  const authUrl = buildAuthenticatedUrl(repoUrl.trim(), pat.trim());

  const { userId } = await getAuthContext(req);
  const session = createSession(sessionId, authUrl, cleanBranch, localPath, [], [], userId);

  setTimeout(() => {
    resumeFixing(session).catch(err =>
      console.error(`[CodeLens] resumeFixing error for ${sessionId}:`, err),
    );
  }, 600);

  return res.status(202).json({
    sessionId,
    streamUrl: `/api/v1/codelens/review/stream?sessionId=${sessionId}`,
  });
});

// ─── POST /fix ────────────────────────────────────────────────────────────────

codeLensRouter.post('/fix', async (req: Request, res: Response) => {
  const { session_id, violation_id } = req.body as { session_id?: string; violation_id?: string };
  if (!session_id || !violation_id) {
    return res.status(400).json({ error: 'session_id and violation_id are required' });
  }

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
  if (!session.violations.has(violation_id)) {
    return res.status(404).json({ error: `Violation ${violation_id} not found` });
  }

  res.status(202).json({ status: 'generating', message: 'Fix preview will arrive as a fix_preview SSE event' });
  generateFix(session, violation_id).catch(err =>
    console.error(`[CodeLens] Fix generation failed for ${violation_id}:`, err?.message),
  );
});

// ─── POST /fix/bulk-standard ──────────────────────────────────────────────────
// Fix all open violations of one standard across all files in the session.

codeLensRouter.post('/fix/bulk-standard', async (req: Request, res: Response) => {
  const { session_id, standard_id } = req.body as { session_id?: string; standard_id?: string };
  if (!session_id || !standard_id) {
    return res.status(400).json({ error: 'session_id and standard_id are required' });
  }

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  const standard = STANDARDS.find(s => s.id === standard_id);
  if (!standard) return res.status(404).json({ error: `Standard ${standard_id} not found` });

  const totalFiles = new Set(
    Array.from(session.violations.values())
      .filter(v => v.ruleId === standard_id && v.status === 'open')
      .map(v => v.fileId),
  ).size;

  if (totalFiles === 0) {
    return res.status(400).json({ error: `No open violations for standard ${standard_id}` });
  }

  res.status(202).json({ status: 'started', total_files: totalFiles, standard_id });

  bulkFixByStandard(session, standard_id).catch(err =>
    console.error(`[CodeLens] Bulk fix error for ${standard_id}:`, err?.message),
  );
});

// ─── POST /fix/accept ─────────────────────────────────────────────────────────

codeLensRouter.post('/fix/accept', async (req: Request, res: Response) => {
  const { session_id, violation_id } = req.body as { session_id?: string; violation_id?: string };
  if (!session_id || !violation_id) {
    return res.status(400).json({ error: 'session_id and violation_id are required' });
  }

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  try {
    await applyFix(session, violation_id);
    return res.json({ status: 'applied', branch: session.fixBranch });
  } catch (err: any) {
    return res.status(422).json({ error: err?.message });
  }
});

// ─── POST /fix/push ───────────────────────────────────────────────────────────
// Push the dedicated fix branch to Azure DevOps / GitHub as a NEW branch.

codeLensRouter.post('/fix/push', async (req: Request, res: Response) => {
  const { session_id } = req.body as { session_id?: string };
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  if (!session.fixBranch) {
    return res.status(400).json({ error: 'No fixes have been applied yet — nothing to push.' });
  }

  try {
    const result = await pushFixes(session);
    return res.json({ status: 'pushed', ...result });
  } catch (err: any) {
    const raw = String(err?.message ?? '');
    // Turn the raw git output into an actionable message for the common cases.
    let msg = `Push failed: ${raw.split('\n')[0]}`;
    if (/\b401\b|Unauthorized|Authentication failed/i.test(raw)) {
      msg = 'Push failed (401 Unauthorized): your PAT can read but not write. ' +
            'Regenerate it in Azure DevOps with Code: Read & Write scope (and confirm it has not expired), ' +
            're-enter it, then push again. Your fixes are safe — they are committed locally on ' +
            `${session.fixBranch}.`;
    } else if (/\b403\b|Forbidden|TF401027|denied/i.test(raw)) {
      msg = 'Push failed (403 Forbidden): the token is valid but lacks permission to push to this repo ' +
            '(Contribute / branch policy). Ask for Contribute permission or push the branch manually. ' +
            `Fixes are committed locally on ${session.fixBranch}.`;
    }
    return res.status(502).json({ error: msg });
  }
});

// ─── POST /violation/update ───────────────────────────────────────────────────

codeLensRouter.post('/violation/update', async (req: Request, res: Response) => {
  const { session_id, violation_id, status } = req.body as {
    session_id?: string; violation_id?: string; status?: string;
  };
  if (!session_id || !violation_id || !status) {
    return res.status(400).json({ error: 'session_id, violation_id, and status are required' });
  }

  const validStatuses = ['ignored', 'deferred', 'open'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const session = await getOwnedSession(req, session_id);
  if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });

  const violation = session.violations.get(violation_id);
  if (!violation) return res.status(404).json({ error: `Violation ${violation_id} not found` });

  violation.status = status as 'ignored' | 'deferred' | 'open';

  // Persist to DB so the status survives across sessions (resume)
  if (session.runId) {
    const { setViolationStatus } = await db();
    setViolationStatus({ runId: session.runId, violationId: violation_id, status: status.toUpperCase() })
      .catch(err => console.warn('[CodeLens] setViolationStatus failed (non-fatal):', err?.message));
  }

  // Sticky suppression: an "ignore" is an accepted exception that must NOT
  // re-surface on future reviews (until the offending code changes). Persist it
  // keyed to the code content. "defer" is session-only (deal with it later).
  const cleanUrl = stripGitCredentials(session.repoUrl);
  const file = session.files.find(f => f.fileId === violation.fileId);
  const key = suppressionKey(session.userId, cleanUrl, file?.relativePath ?? '', violation.ruleId, violation.foundCode);
  const { addSuppression, removeSuppression } = await db();
  if (status === 'ignored') {
    addSuppression({ suppKey: key, userId: session.userId, repoUrl: cleanUrl, filePath: file?.relativePath ?? '', standardId: violation.ruleId, status: 'IGNORED' })
      .then(() => { session.suppressions.add(key); })
      .catch(err => console.warn('[CodeLens] addSuppression failed (non-fatal):', err?.message));
  } else if (status === 'open') {
    // Un-ignore → lift the suppression.
    session.suppressions.delete(key);
    removeSuppression(key).catch(err => console.warn('[CodeLens] removeSuppression failed (non-fatal):', err?.message));
  }

  return res.json({ status: 'updated', violation_id, new_status: status });
});

// ─── GET /report/:sessionId/excel ─────────────────────────────────────────────
// Three-sheet Excel workbook: Violations, File Summary, Standards Summary

codeLensRouter.get('/report/:sessionId/excel', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  // Source the data from the live session when available; otherwise rebuild it
  // from the DB. This makes export work after stop/cancel, server restart, or
  // session TTL purge — the user never loses reviewed results.
  const { userId } = await getAuthContext(req);
  const liveSession = getSession(sessionId);
  // Ownership: a live session can only be exported by its owner.
  if (liveSession && liveSession.userId !== userId) {
    return res.status(404).json({ error: `No results found for session ${sessionId}` });
  }
  const hasLiveData = !!liveSession &&
    (liveSession.violations.size > 0 || liveSession.fileSummaries.size > 0);

  let src: {
    files: { fileId: string; relativePath: string }[];
    violations: Map<string, { fileId: string; ruleId: string; ruleName: string; severity: string; lineStart: number; foundCode: string; recommendedFix: string; status: string }>;
    fileSummaries: Map<string, { critical: number; warning: number; info: number; passed: number; notApplicable: number; errors: number; applicableCells: number; verifiedCells: number; status: 'PASS' | 'FAIL' }>;
    standardResults: { fileId: string; ruleId: string; status: string; violationCount: number }[];
  };

  if (hasLiveData) {
    src = liveSession as unknown as typeof src;
  } else {
    const { getRunExportDataBySessionId } = await db();
    const dbData = await getRunExportDataBySessionId(sessionId, userId);
    if (!dbData) {
      return res.status(404).json({ error: `No results found for session ${sessionId}` });
    }
    src = dbData;
  }

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ASTRA Code Lens';
  workbook.created = new Date();

  const fileIndex = new Map(src.files.map(f => [f.fileId, f.relativePath]));
  const allViolations = Array.from(src.violations.values());

  // ── Sheet 1: Violations ───────────────────────────────────────────────────
  const sheet1 = workbook.addWorksheet('Violations');
  sheet1.columns = [
    { header: 'File Name',       key: 'fileName',     width: 40 },
    { header: 'File Path',       key: 'filePath',     width: 80 },
    { header: 'Standard ID',     key: 'standardId',   width: 14 },
    { header: 'Standard Name',   key: 'standardName', width: 35 },
    { header: 'Severity',        key: 'severity',     width: 12 },
    { header: 'Line Number',     key: 'lineNumber',   width: 13 },
    { header: 'Found Code',      key: 'foundCode',    width: 60 },
    { header: 'Violation Detail',key: 'detail',       width: 70 },
    { header: 'Status',          key: 'status',       width: 12 },
  ];

  // Bold, grey header
  const hdr1 = sheet1.getRow(1);
  hdr1.font = { bold: true, color: { argb: 'FF000000' } };
  hdr1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  hdr1.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const v of allViolations) {
    const filePath = fileIndex.get(v.fileId) ?? v.fileId;
    const row = sheet1.addRow({
      fileName:    path.basename(filePath),
      filePath,
      standardId:  v.ruleId,
      standardName:v.ruleName,
      severity:    v.severity,
      lineNumber:  v.lineStart,
      foundCode:   v.foundCode,
      detail:      v.recommendedFix,
      status: v.status.toUpperCase(),
    });

    let bgArgb = 'FFFFFFFF';
    if (v.status === 'fixed')    bgArgb = 'FFE0FFE0';
    else if (v.status === 'ignored' || v.status === 'deferred') bgArgb = 'FFF0F0F0';
    else if (v.severity === 'Critical') bgArgb = 'FFFFE0E0';
    else if (v.severity === 'Warning')  bgArgb = 'FFFFF3CD';

    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  }

  sheet1.views = [{ state: 'frozen', ySplit: 1 }];
  sheet1.autoFilter = { from: 'A1', to: 'I1' };

  // ── Sheet 2: File Summary ─────────────────────────────────────────────────
  const sheet2 = workbook.addWorksheet('File Summary');
  sheet2.columns = [
    { header: 'File Name',         key: 'fileName',    width: 40 },
    { header: 'File Path',         key: 'filePath',    width: 80 },
    { header: 'File Type',         key: 'fileType',    width: 16 },
    { header: 'Standards Checked', key: 'checked',     width: 18 },
    { header: 'Critical',          key: 'critical',    width: 12 },
    { header: 'Warning',           key: 'warning',     width: 12 },
    { header: 'Info',              key: 'info',        width: 10 },
    { header: 'Pass',              key: 'pass',        width: 10 },
    { header: 'N/A',               key: 'na',          width: 10 },
    { header: 'Checks Verified',   key: 'verified',    width: 16 },
    { header: 'Confidence %',      key: 'confidence',  width: 14 },
    { header: 'Compliance %',      key: 'compliance',  width: 14 },
    { header: 'Status',            key: 'status',      width: 10 },
  ];

  const hdr2 = sheet2.getRow(1);
  hdr2.font = { bold: true };
  hdr2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

  // Build file type classifier
  function classifyFilePath(fp: string): string {
    const lower = fp.toLowerCase();
    const base = path.basename(lower);
    if (base === 'program.cs') return 'program';
    if (base.endsWith('controller.cs')) return 'controller';
    if (base.endsWith('service.cs')) return 'service';
    if (base.endsWith('repository.cs')) return 'repository';
    if (lower.includes('/infrastructure/')) return 'infrastructure';
    if (lower.includes('/migrations/')) return 'migration';
    if (base.endsWith('dto.cs') || base.endsWith('request.cs') || base.endsWith('response.cs')) return 'dto';
    return 'general';
  }

  // Sort files: most critical first, then most warnings
  const sortedFiles = Array.from(src.fileSummaries.entries())
    .map(([fileId, summary]) => ({ fileId, summary }))
    .sort((a, b) => {
      if (b.summary.critical !== a.summary.critical) return b.summary.critical - a.summary.critical;
      return b.summary.warning - a.summary.warning;
    });

  for (const { fileId, summary } of sortedFiles) {
    const filePath = fileIndex.get(fileId) ?? fileId;
    const checked = summary.critical + summary.warning + summary.info + summary.passed;
    const compliance = checked > 0 ? Math.round((summary.passed / checked) * 100) : 100;
    // Review confidence = verified applicable checks ÷ applicable checks.
    const confidence = summary.applicableCells > 0
      ? Math.round((summary.verifiedCells / summary.applicableCells) * 100)
      : 100;
    const row = sheet2.addRow({
      fileName:   path.basename(filePath),
      filePath,
      fileType:   classifyFilePath(filePath),
      checked,
      critical:   summary.critical,
      warning:    summary.warning,
      info:       summary.info,
      pass:       summary.passed,
      na:         summary.notApplicable,
      verified:   `${summary.verifiedCells}/${summary.applicableCells}`,
      confidence: summary.applicableCells > 0 ? `${confidence}%` : 'n/a',
      compliance: `${compliance}%`,
      status:     summary.status,
    });

    const bgArgb = summary.status === 'PASS' ? 'FFE0FFE0' : (summary.critical > 0 ? 'FFFFE0E0' : 'FFFFF3CD');
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    });
  }

  sheet2.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Sheet 3: Standards Summary ────────────────────────────────────────────
  const sheet3 = workbook.addWorksheet('Standards Summary');
  sheet3.columns = [
    { header: 'Standard ID',       key: 'id',          width: 14 },
    { header: 'Standard Name',     key: 'name',        width: 40 },
    { header: 'Severity',          key: 'severity',    width: 12 },
    { header: 'Files Checked',     key: 'checked',     width: 15 },
    { header: 'Violations Found',  key: 'violations',  width: 17 },
    { header: 'Pass Count',        key: 'pass',        width: 12 },
    { header: 'Violation Rate %',  key: 'rate',        width: 16 },
  ];

  const hdr3 = sheet3.getRow(1);
  hdr3.font = { bold: true };
  hdr3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

  // Name/severity map covering built-ins AND any custom standard that appears in
  // the results (so custom standards show up in the summary too).
  const nameMap = new Map<string, { name: string; severity: string }>();
  for (const std of STANDARDS) nameMap.set(std.id, { name: std.name, severity: std.severity });
  for (const v of allViolations) {
    if (!nameMap.has(v.ruleId)) nameMap.set(v.ruleId, { name: v.ruleName, severity: v.severity });
  }

  // Aggregate standard results — include every standard id seen, built-in or custom.
  const stdMap = new Map<string, { checked: number; violations: number; pass: number }>();
  for (const id of Array.from(nameMap.keys())) stdMap.set(id, { checked: 0, violations: 0, pass: 0 });

  for (const result of src.standardResults) {
    let entry = stdMap.get(result.ruleId);
    if (!entry) { entry = { checked: 0, violations: 0, pass: 0 }; stdMap.set(result.ruleId, entry); nameMap.set(result.ruleId, { name: result.ruleId, severity: 'Info' }); }
    if (result.status === 'NOT_APPLICABLE') continue; // don't count N/A in "checked"
    entry.checked++;
    if (result.status === 'VIOLATION') entry.violations++;
    else if (result.status === 'PASS') entry.pass++;
  }

  // Sort by violation rate descending
  const stdRows = Array.from(stdMap.keys())
    .map(id => {
      const entry = stdMap.get(id)!;
      const meta = nameMap.get(id) ?? { name: id, severity: 'Info' };
      const rate = entry.checked > 0 ? Math.round((entry.violations / entry.checked) * 100) : 0;
      return { id, name: meta.name, severity: meta.severity, entry, rate };
    })
    .sort((a, b) => b.rate - a.rate);

  for (const { id, name, severity, entry, rate } of stdRows) {
    const row = sheet3.addRow({
      id,
      name,
      severity,
      checked:    entry.checked,
      violations: entry.violations,
      pass:       entry.pass,
      rate:       `${rate}%`,
    });

    const bgArgb = rate > 50 ? 'FFFFE0E0' : rate > 0 ? 'FFFFF3CD' : 'FFE0FFE0';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    });
  }

  sheet3.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Stream response ────────────────────────────────────────────────────────
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="astra-code-lens-${sessionId}.xlsx"`,
  );
  await workbook.xlsx.write(res);
  res.end();
});

// ─── GET /file/:sessionId/:fileId ─────────────────────────────────────────────

codeLensRouter.get('/file/:sessionId/:fileId', async (req: Request, res: Response) => {
  const { sessionId, fileId } = req.params;
  const session = await getOwnedSession(req, sessionId);
  if (!session) return res.status(404).json({ error: `Session ${sessionId} not found` });

  const file = session.files.find(f => f.fileId === fileId);
  if (!file) return res.status(404).json({ error: `File ${fileId} not found` });

  try {
    const content = fs.readFileSync(file.absolutePath, 'utf-8');
    return res.json({ fileId, relativePath: file.relativePath, content });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// ─── POST /repo/browse ────────────────────────────────────────────────────────
// Returns top-level folders in the repo

codeLensRouter.post('/repo/browse', async (req: Request, res: Response) => {
  const { repoUrl, branch = '', pat = '' } = req.body as {
    repoUrl?: string; branch?: string; pat?: string;
  };
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });

  try {
    const localPath = await getOrCloneForBrowse(repoUrl.trim(), branch.trim(), pat.trim());
    const dirs = await gitLsTree(localPath); // full top-level paths, e.g. "server"
    const folders = await Promise.all(
      dirs.map(async dirPath => {
        const subDirs = await gitLsTree(localPath, dirPath).catch(() => []);
        return { name: baseSegment(dirPath), path: dirPath, hasChildren: subDirs.length > 0 };
      }),
    );
    return res.json({ folders });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Clone/browse failed' });
  }
});

// ─── POST /repo/browse-folder ─────────────────────────────────────────────────
// Returns subfolders of a given folder path and the .cs file count inside it

codeLensRouter.post('/repo/browse-folder', async (req: Request, res: Response) => {
  const { repoUrl, branch = '', pat = '', folderPath } = req.body as {
    repoUrl?: string; branch?: string; pat?: string; folderPath?: string;
  };
  if (!repoUrl || !folderPath) {
    return res.status(400).json({ error: 'repoUrl and folderPath are required' });
  }

  try {
    const localPath = await getOrCloneForBrowse(repoUrl.trim(), branch.trim(), pat.trim());
    // gitLsTree now returns FULL root-relative child paths (e.g. "src/Services").
    // Use them directly — never re-concatenate folderPath (that caused "src/src").
    const dirs = await gitLsTree(localPath, folderPath);
    const csFiles = await gitLsFiles(localPath, folderPath);

    const folders = await Promise.all(
      dirs.map(async fullPath => {
        const subDirs = await gitLsTree(localPath, fullPath).catch(() => []);
        const subCs = await gitLsFiles(localPath, fullPath).catch(() => []);
        return { name: baseSegment(fullPath), path: fullPath, hasChildren: subDirs.length > 0, fileCount: subCs.length };
      }),
    );

    return res.json({ folders, fileCount: csFiles.length });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Browse folder failed' });
  }
});

// ─── POST /ignore/parse ───────────────────────────────────────────────────────
// Parse raw .codelensignore file content and return clean pattern array

codeLensRouter.post('/ignore/parse', (req: Request, res: Response) => {
  const { content } = req.body as { content?: string };
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content (string) is required' });
  }

  const patterns = parseIgnoreFileContent(content);
  return res.json({
    patterns,
    count: patterns.length,
    preview: patterns.slice(0, 10),
  });
});

// ─── POST /test-single-standard ───────────────────────────────────────────────

codeLensRouter.post('/test-single-standard', async (req: Request, res: Response) => {
  const { fileContent, filePath, standardId } = req.body as {
    fileContent?: string; filePath?: string; standardId?: string;
  };
  if (!fileContent || !filePath || !standardId) {
    return res.status(400).json({ error: 'fileContent, filePath, and standardId are required' });
  }

  const standard = STANDARDS.find(s => s.id === standardId);
  if (!standard) {
    return res.status(404).json({ error: `Standard ${standardId} not found`, availableIds: STANDARDS.map(s => s.id) });
  }

  const lowerPath = filePath.toLowerCase();
  const fileName = path.basename(lowerPath);
  let fileType = 'general';
  if (fileName === 'program.cs') fileType = 'program';
  else if (fileName.endsWith('controller.cs')) fileType = 'controller';
  else if (fileName.endsWith('service.cs')) fileType = 'service';
  else if (fileName.endsWith('repository.cs')) fileType = 'repository';
  else if (lowerPath.includes('/infrastructure/') || lowerPath.includes('\\infrastructure\\')) fileType = 'infrastructure';
  else if (lowerPath.includes('/migrations/') || lowerPath.includes('\\migrations\\')) fileType = 'migration';
  else if (fileName.endsWith('dto.cs') || fileName.endsWith('request.cs') || fileName.endsWith('response.cs') || fileName.endsWith('model.cs')) fileType = 'dto';

  try {
    const result = await checkFileAgainstStandard(filePath, fileContent, standard, fileType);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// ─── GET /session/:sessionId ──────────────────────────────────────────────────

codeLensRouter.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = await getOwnedSession(req, sessionId);
  if (!session) return res.status(404).json({ error: `Session ${sessionId} not found` });

  const allViolations = Array.from(session.violations.values());
  return res.json({
    sessionId: session.sessionId,
    status: session.status,
    repoUrl: session.repoUrl,
    branch: session.branch,
    totalFiles: session.totalFiles,
    reviewedFiles: session.fileSummaries.size,
    lastReviewedFileIndex: session.lastReviewedFileIndex,
    totalViolations: allViolations.length,
    critical: allViolations.filter(v => v.severity === 'Critical').length,
    warning: allViolations.filter(v => v.severity === 'Warning').length,
    info: allViolations.filter(v => v.severity === 'Info').length,
  });
});

// ─── History & Comparison ────────────────────────────────────────────────────

// Most recent runs across all repos — powers the dashboard landing.
codeLensRouter.get('/history/recent', async (req: Request, res: Response) => {
  const { limit = '8' } = req.query as Record<string, string>;
  try {
    const { userId } = await getAuthContext(req);
    const { getRecentRuns } = await db();
    const runs = await getRecentRuns(userId, Math.min(parseInt(limit, 10) || 8, 25));
    return res.json({ runs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Failed to fetch recent runs' });
  }
});

// The full standards catalog = built-in 42 (read-only) + custom (editable).
codeLensRouter.get('/standards', async (_req: Request, res: Response) => {
  let custom: any[] = [];
  let disabledBuiltins = new Set<string>();
  try {
    const { userId } = await getAuthContext(_req);
    const { listCustomStandards, getDisabledBuiltinIds } = await db();
    const [customRows, disabledIds] = await Promise.all([
      listCustomStandards(userId),
      getDisabledBuiltinIds(userId).catch(() => [] as string[]),
    ]);
    disabledBuiltins = new Set(disabledIds);
    custom = customRows.map(c => ({
      id: c.id, name: c.name, severity: c.severity, description: c.description,
      appliesTo: c.appliesTo, notApplicableWhen: c.notApplicableWhen,
      whatToLookFor: c.whatToLookFor, custom: true, enabled: c.enabled,
    }));
  } catch (e: any) {
    console.warn('[CodeLens] listCustomStandards failed (showing built-ins only):', e?.message);
  }
  // Built-ins reflect this user's enable/disable choices (per-user standards).
  const builtin = STANDARDS.map(s => ({
    id: s.id, name: s.name, severity: s.severity, description: s.description,
    appliesTo: s.appliesTo, custom: false, enabled: !disabledBuiltins.has(s.id),
  }));
  const activeCount = builtin.filter(b => b.enabled).length + custom.filter(c => c.enabled).length;
  return res.json({
    total: builtin.length + custom.length,
    builtinCount: builtin.length,
    customCount: custom.length,
    activeCount,
    standards: [...builtin, ...custom],
  });
});

// ─── Custom standards CRUD (built-ins are read-only) ──────────────────────────

const VALID_SCOPES = ['all', 'controller', 'service', 'repository', 'dto', 'migration', 'program', 'infrastructure', 'non-migration'];
const VALID_SEVERITIES = ['Critical', 'Warning', 'Info'];

function validateStandardInput(b: any): string | null {
  if (!b?.name || typeof b.name !== 'string') return 'name is required';
  if (!VALID_SEVERITIES.includes(b.severity)) return `severity must be one of: ${VALID_SEVERITIES.join(', ')}`;
  if (!b?.description) return 'description is required';
  if (!b?.whatToLookFor) return 'whatToLookFor is required';
  if (!VALID_SCOPES.includes(b.appliesTo)) return `appliesTo must be one of: ${VALID_SCOPES.join(', ')}`;
  return null;
}

codeLensRouter.post('/standards', async (req: Request, res: Response) => {
  const err = validateStandardInput(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    const { userId } = await getAuthContext(req);
    const { createCustomStandard } = await db();
    const created = await createCustomStandard(userId, {
      name: req.body.name, severity: req.body.severity, description: req.body.description,
      whatToLookFor: req.body.whatToLookFor, appliesTo: req.body.appliesTo,
      notApplicableWhen: req.body.notApplicableWhen ?? '',
    });
    return res.status(201).json({ standard: { ...created, custom: true } });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to create standard' });
  }
});

codeLensRouter.patch('/standards/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { userId } = await getAuthContext(req);
    // Built-in standards: only per-user enable/disable is allowed (content is fixed).
    if (!/^C/i.test(id)) {
      if (typeof req.body?.enabled !== 'boolean') {
        return res.status(400).json({ error: 'Built-in standards support only enable/disable (send { enabled: boolean }).' });
      }
      if (!STANDARDS.some(s => s.id === id)) {
        return res.status(404).json({ error: `Unknown built-in standard ${id}` });
      }
      const { setBuiltinDisabled } = await db();
      await setBuiltinDisabled(userId, id, !req.body.enabled);
      return res.json({ standard: { id, custom: false, enabled: req.body.enabled } });
    }
    const { updateCustomStandard } = await db();
    const updated = await updateCustomStandard(id, userId, req.body ?? {});
    if (!updated) return res.status(404).json({ error: `Custom standard ${id} not found (or not yours)` });
    return res.json({ standard: { ...updated, custom: true } });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to update standard' });
  }
});

// ─── POST /standards/builtins/toggle-all ──────────────────────────────────────
// Enable or disable ALL 42 built-in standards for the calling user at once.
codeLensRouter.post('/standards/builtins/toggle-all', async (req: Request, res: Response) => {
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled (boolean) is required' });
  try {
    const { userId } = await getAuthContext(req);
    const { enableAllBuiltins, disableBuiltins } = await db();
    if (enabled) await enableAllBuiltins(userId);
    else await disableBuiltins(userId, STANDARDS.map(s => s.id));
    return res.json({ status: 'ok', enabled, count: STANDARDS.length });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to toggle built-in standards' });
  }
});

// ─── POST /standards/import ───────────────────────────────────────────────────
// Import a standards document (any text format) as this user's custom standards.
// mode 'replace' = disable all built-ins + clear existing custom, then import.
// mode 'augment' = keep everything and add the imported rules.
codeLensRouter.post('/standards/import', async (req: Request, res: Response) => {
  const { content = '', mode = 'augment' } = req.body as { content?: string; mode?: 'replace' | 'augment' };
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'content (the standards document text) is required' });
  }

  let parsed;
  try {
    parsed = await parseStandardsDocument(content);
  } catch (e: any) {
    return res.status(502).json({ error: `Could not parse the standards document: ${e?.message ?? 'unknown error'}` });
  }
  if (parsed.length === 0) {
    return res.status(422).json({ error: 'No coding standards could be extracted from that document.' });
  }

  try {
    const { userId } = await getAuthContext(req);
    const dbm = await db();
    let clearedCustom = 0;
    if (mode === 'replace') {
      clearedCustom = await dbm.deleteAllCustomStandards(userId);
      await dbm.disableBuiltins(userId, STANDARDS.map(s => s.id));
    }
    let imported = 0;
    for (const p of parsed) {
      try { await dbm.createCustomStandard(userId, p); imported++; } catch { /* skip bad row */ }
    }
    return res.json({
      status: 'ok',
      mode,
      parsed: parsed.length,
      imported,
      clearedCustom,
      builtinsDisabled: mode === 'replace' ? STANDARDS.length : 0,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to import standards' });
  }
});

codeLensRouter.delete('/standards/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^C/i.test(id)) return res.status(400).json({ error: 'Built-in standards cannot be deleted.' });
  try {
    const { userId } = await getAuthContext(req);
    const { deleteCustomStandard } = await db();
    await deleteCustomStandard(id, userId);
    return res.json({ status: 'deleted', id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to delete standard' });
  }
});

codeLensRouter.get('/history', async (req: Request, res: Response) => {
  const { repoUrl, branch = 'main', limit = '10' } = req.query as Record<string, string>;
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });
  try {
    const { userId } = await getAuthContext(req);
    const { getRunHistory } = await db();
    const runs = await getRunHistory(repoUrl, branch, userId, Math.min(parseInt(limit, 10) || 10, 50));
    return res.json({ runs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Failed to fetch history' });
  }
});

codeLensRouter.get('/runs/:runId', async (req: Request, res: Response) => {
  const { runId } = req.params;
  try {
    const { userId } = await getAuthContext(req);
    const { getRunDetail } = await db();
    const detail = await getRunDetail(runId, userId);
    if (!detail) return res.status(404).json({ error: `Run ${runId} not found` });
    return res.json(detail);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Failed to fetch run' });
  }
});

codeLensRouter.get('/runs/:runId/violations', async (req: Request, res: Response) => {
  const { runId } = req.params;
  const { filePath, severity } = req.query as Record<string, string>;
  try {
    const { userId } = await getAuthContext(req);
    const { getRunViolations } = await db();
    const violations = await getRunViolations(runId, userId, filePath, severity);
    return res.json({ violations });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Failed to fetch violations' });
  }
});

codeLensRouter.get('/compare', async (req: Request, res: Response) => {
  const { runId1, runId2 } = req.query as Record<string, string>;
  if (!runId1 || !runId2) return res.status(400).json({ error: 'runId1 and runId2 are required' });
  try {
    const { userId } = await getAuthContext(req);
    const { compareRuns } = await db();
    const result = await compareRuns(runId1, runId2, userId);
    if (!result) return res.status(404).json({ error: 'One or both runs not found' });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Failed to compare runs' });
  }
});
