/**
 * ASTRA Code Lens — GitHub App REST client (Phase 3)
 *
 * No external SDK: the App JWT is signed with Node's crypto (RS256) and all calls
 * use the global fetch. Secrets come from env:
 *   GITHUB_APP_ID            — numeric App id
 *   GITHUB_APP_PRIVATE_KEY   — PEM (PKCS#1/8); literal "\n" are unescaped
 *   GITHUB_WEBHOOK_SECRET    — HMAC secret (used by codelens-webhook.ts)
 *
 * The `fetchImpl` parameter is injectable so request construction is unit-tested
 * without the network. Live calls require an installed App (not exercised here).
 */

import crypto from 'crypto';

export type FetchLike = (url: string, init?: any) => Promise<{
  ok: boolean; status: number; text(): Promise<string>; json(): Promise<any>;
}>;

const GITHUB_API = 'https://api.github.com';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** True when the App credentials are present — callers should no-op gracefully otherwise. */
export function isGithubAppConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

function privateKeyPem(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY ?? '';
  // Allow the key to be stored as a single line with escaped newlines.
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

/**
 * Short-lived (10 min) App JWT, RS256-signed. `nowSec` is injectable for tests;
 * defaults to the real clock (fine in server code — not a Workflow script).
 */
export function buildAppJwt(appId: string, pem: string, nowSec: number = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iat: nowSec - 60,   // clock-skew guard
    exp: nowSec + 540,  // < 10 min
    iss: appId,
  }));
  const data = `${header}.${payload}`;
  const sig = crypto.createSign('RSA-SHA256').update(data).sign(privateKeyPemNormalize(pem));
  return `${data}.${b64url(sig)}`;
}

function privateKeyPemNormalize(pem: string): string {
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
}

/** Exchange the App JWT for an installation access token (repo-scoped). */
export async function getInstallationToken(
  installationId: number,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  if (!isGithubAppConfigured()) throw new Error('GitHub App not configured (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)');
  const jwt = buildAppJwt(String(process.env.GITHUB_APP_ID), privateKeyPem());
  const res = await fetchImpl(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'astra-code-lens',
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`installation token failed (${res.status}): ${body?.message ?? ''}`);
  return body.token as string;
}

/** Build a clone URL authenticated with an installation token. */
export function installationCloneUrl(repoFullName: string, token: string): string {
  return `https://x-access-token:${token}@github.com/${repoFullName}.git`;
}

/** Low-level authenticated request against the installation token. */
export async function ghRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<any> {
  const res = await fetchImpl(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'astra-code-lens',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`GitHub ${method} ${path} failed (${res.status}): ${json?.message ?? text}`);
  return json;
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export type CheckConclusion = 'success' | 'failure' | 'neutral' | 'action_required';

export interface CheckRunInput {
  repoFullName: string;
  headSha: string;
  /** in_progress while running; completed with a conclusion when done. */
  status: 'in_progress' | 'completed';
  conclusion?: CheckConclusion;
  title: string;
  summary: string;
}

/** Build the Check Run request body (pure — unit-tested). */
export function buildCheckRunBody(input: CheckRunInput): Record<string, unknown> {
  return {
    name: 'ASTRA Code Lens',
    head_sha: input.headSha,
    status: input.status,
    ...(input.status === 'completed' ? { conclusion: input.conclusion ?? 'neutral' } : {}),
    output: { title: input.title, summary: input.summary },
  };
}

export function createCheckRun(input: CheckRunInput, token: string, fetchImpl?: FetchLike): Promise<any> {
  return ghRequest('POST', `/repos/${input.repoFullName}/check-runs`, token, buildCheckRunBody(input), fetchImpl);
}

/** Transition an existing check run (e.g. in_progress → completed). */
export function updateCheckRun(
  repoFullName: string,
  checkRunId: number,
  patch: { status?: 'in_progress' | 'completed'; conclusion?: CheckConclusion; title: string; summary: string },
  token: string,
  fetchImpl?: FetchLike,
): Promise<any> {
  return ghRequest('PATCH', `/repos/${repoFullName}/check-runs/${checkRunId}`, token, {
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.conclusion ? { conclusion: patch.conclusion } : {}),
    output: { title: patch.title, summary: patch.summary },
  }, fetchImpl);
}

export function createIssueComment(repoFullName: string, issueNumber: number, body: string, token: string, fetchImpl?: FetchLike): Promise<any> {
  return ghRequest('POST', `/repos/${repoFullName}/issues/${issueNumber}/comments`, token, { body }, fetchImpl);
}

/** Files changed in a PR (paginated caller-side if needed; first 300 here). */
export async function listPrFiles(repoFullName: string, prNumber: number, token: string, fetchImpl?: FetchLike): Promise<string[]> {
  const out: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch: any[] = await ghRequest('GET', `/repos/${repoFullName}/pulls/${prNumber}/files?per_page=100&page=${page}`, token, undefined, fetchImpl);
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const f of batch) if (f?.filename) out.push(f.filename as string);
    if (batch.length < 100) break;
  }
  return out;
}

/** Open a PR (used for the companion fixes branch → PR head branch). */
export function openPullRequest(
  repoFullName: string,
  opts: { title: string; head: string; base: string; body: string },
  token: string,
  fetchImpl?: FetchLike,
): Promise<any> {
  return ghRequest('POST', `/repos/${repoFullName}/pulls`, token, opts, fetchImpl);
}
