// Azure DevOps Pull Request client for ASTRA Code Lens.
//
// Responsibilities:
//   1. Parse an Azure DevOps PR URL into { org, project, repo, pullRequestId }.
//   2. Read the PR (source/target branch) and its changed file list via REST.
//   3. Post a single summary comment thread back to the PR.
//
// Auth: Azure DevOps PAT via Basic auth (username blank, password = PAT).
// The PAT is passed in per call and is never persisted.

const API_VERSION = '7.1';

export interface AzurePrRef {
  org: string;
  project: string;
  repo: string;
  pullRequestId: number;
  /** REST API base, e.g. https://dev.azure.com/{org}/{project} */
  apiBase: string;
  /** The web URL exactly as the user supplied it. */
  webUrl: string;
}

export interface AzurePr {
  pullRequestId: number;
  title: string;
  sourceBranch: string;   // short name, e.g. feature/foo (refs/heads/ stripped)
  targetBranch: string;
  repositoryId: string;
  repositoryName: string;
  status: string;
}

/** Parse an Azure DevOps PR URL. Supports:
 *   https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}
 *   https://{org}.visualstudio.com/{project}/_git/{repo}/pullrequest/{id}
 * Segments may be percent-encoded (project/repo names with spaces). */
export function parseAzurePrUrl(rawUrl: string): AzurePrRef | null {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { return null; }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean).map(s => {
    try { return decodeURIComponent(s); } catch { return s; }
  });

  const gitIdx = segments.findIndex(s => s === '_git');
  if (gitIdx < 1) return null;                       // need a project segment before _git
  const repo = segments[gitIdx + 1];
  const project = segments[gitIdx - 1];
  if (!repo || !project) return null;

  const prIdx = segments.findIndex(s => s.toLowerCase() === 'pullrequest');
  const idStr = prIdx !== -1 ? segments[prIdx + 1] : '';
  const pullRequestId = Number(idStr);
  if (!Number.isInteger(pullRequestId) || pullRequestId <= 0) return null;

  let org: string;
  let apiOrigin: string;
  if (host === 'dev.azure.com') {
    org = segments[0];                               // /{org}/{project}/_git/...
    if (!org) return null;
    apiOrigin = `https://dev.azure.com/${encodeURIComponent(org)}`;
  } else if (host.endsWith('.visualstudio.com')) {
    org = host.slice(0, -('.visualstudio.com'.length));
    if (!org) return null;
    apiOrigin = `https://${org}.visualstudio.com`;
  } else {
    return null;                                     // not an Azure DevOps host
  }

  return {
    org,
    project,
    repo,
    pullRequestId,
    apiBase: `${apiOrigin}/${encodeURIComponent(project)}`,
    webUrl: rawUrl.trim(),
  };
}

/** The HTTPS git clone URL for the PR's repository. */
export function repoCloneUrl(ref: AzurePrRef): string {
  return `${ref.apiBase}/_git/${encodeURIComponent(ref.repo)}`;
}

function authHeader(pat: string): string {
  return 'Basic ' + Buffer.from(':' + pat).toString('base64');
}

function stripRef(ref?: string): string {
  return (ref ?? '').replace(/^refs\/heads\//, '');
}

/** Build a helpful error from an Azure DevOps non-OK response. */
function azureError(status: number, body: string, action: string): Error {
  let detail = body.slice(0, 300);
  try { const j = JSON.parse(body); if (j?.message) detail = String(j.message); } catch { /* keep raw */ }
  const needsWrite = action.includes('comment');
  if (status === 401 || status === 203) {
    return new Error(
      `Azure DevOps authentication failed (HTTP ${status}) while trying to ${action}. ` +
      `Check that the PAT is valid and has Code (${needsWrite ? 'Read and Write' : 'Read'}) scope. ${detail}`,
    );
  }
  if (status === 404) {
    return new Error(
      `Azure DevOps returned 404 while trying to ${action}. ` +
      `Check the PR URL org, project, repo, and PR id are correct and the PAT can access this project. ${detail}`,
    );
  }
  return new Error(`Azure DevOps error (HTTP ${status}) while trying to ${action}: ${detail}`);
}

async function azureGet(endpoint: string, pat: string, action: string): Promise<any> {
  const resp = await fetch(endpoint, {
    headers: { Authorization: authHeader(pat), Accept: 'application/json' },
  });
  if (!resp.ok) throw azureError(resp.status, await resp.text().catch(() => ''), action);
  return resp.json();
}

/** Read PR metadata (source/target branch, repository, title). */
export async function getPullRequest(ref: AzurePrRef, pat: string): Promise<AzurePr> {
  const endpoint =
    `${ref.apiBase}/_apis/git/repositories/${encodeURIComponent(ref.repo)}` +
    `/pullRequests/${ref.pullRequestId}?api-version=${API_VERSION}`;
  const data = await azureGet(endpoint, pat, 'read the pull request');
  return {
    pullRequestId: data.pullRequestId ?? ref.pullRequestId,
    title: data.title ?? '',
    sourceBranch: stripRef(data.sourceRefName),
    targetBranch: stripRef(data.targetRefName),
    repositoryId: data.repository?.id ?? ref.repo,
    repositoryName: data.repository?.name ?? ref.repo,
    status: data.status ?? '',
  };
}

/** List the repo-relative paths of files changed in the PR (adds/edits only;
 *  deletes and folders are skipped since there is nothing to review). */
export async function getPullRequestChangedFiles(ref: AzurePrRef, pat: string): Promise<string[]> {
  const base =
    `${ref.apiBase}/_apis/git/repositories/${encodeURIComponent(ref.repo)}` +
    `/pullRequests/${ref.pullRequestId}`;

  // Latest iteration = the current state of the PR source branch.
  const itData = await azureGet(`${base}/iterations?api-version=${API_VERSION}`, pat, 'list PR iterations');
  const iterations: any[] = itData.value ?? [];
  if (!iterations.length) return [];
  const latest = iterations[iterations.length - 1].id;

  // compareTo=0 → all changes for the iteration versus the target base.
  const chData = await azureGet(
    `${base}/iterations/${latest}/changes?$compareTo=0&api-version=${API_VERSION}`,
    pat,
    'fetch PR file changes',
  );
  const entries: any[] = chData.changeEntries ?? chData.value ?? [];

  const files = new Set<string>();
  for (const e of entries) {
    const item = e.item ?? {};
    if (item.isFolder || item.gitObjectType === 'tree') continue;
    const changeType = String(e.changeType ?? '').toLowerCase();
    if (changeType.includes('delete')) continue;            // no content to review
    const p = String(item.path ?? '').replace(/^\//, '').replace(/\\/g, '/');
    if (p) files.add(p);
  }
  return Array.from(files);
}

/** Post a single summary comment thread on the PR. Returns the new thread id. */
export async function postPullRequestThread(
  ref: Pick<AzurePrRef, 'apiBase' | 'repo' | 'pullRequestId'>,
  pat: string,
  markdown: string,
): Promise<{ threadId: number }> {
  const endpoint =
    `${ref.apiBase}/_apis/git/repositories/${encodeURIComponent(ref.repo)}` +
    `/pullRequests/${ref.pullRequestId}/threads?api-version=${API_VERSION}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader(pat),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    // commentType 1 = text; status 1 = active.
    body: JSON.stringify({
      comments: [{ parentCommentId: 0, content: markdown, commentType: 1 }],
      status: 1,
    }),
  });
  if (!resp.ok) throw azureError(resp.status, await resp.text().catch(() => ''), 'post the review comment');
  const data: any = await resp.json();
  return { threadId: data.id };
}
