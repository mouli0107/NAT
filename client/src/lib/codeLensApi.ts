const BASE = '/api/v1/codelens';

export async function startReview(
  repoUrl: string,
  branch: string,
  pat: string,
  folders: string[] = [],
  ignorePatterns: string[] = [],
) {
  const res = await fetch(`${BASE}/review/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, branch, pat, folders, ignorePatterns }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ sessionId: string; streamUrl: string }>;
}

export async function parseIgnoreFile(content: string): Promise<{
  patterns: string[];
  count: number;
  preview: string[];
}> {
  const res = await fetch(`${BASE}/ignore/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function stopReview(sessionId: string) {
  const res = await fetch(`${BASE}/review/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resumeReview(sessionId: string) {
  const res = await fetch(`${BASE}/review/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function requestFix(sessionId: string, violationId: string) {
  const res = await fetch(`${BASE}/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, violation_id: violationId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function acceptFix(sessionId: string, violationId: string) {
  const res = await fetch(`${BASE}/fix/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, violation_id: violationId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateViolationStatus(
  sessionId: string,
  violationId: string,
  status: 'ignored' | 'deferred',
) {
  const res = await fetch(`${BASE}/violation/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, violation_id: violationId, status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFileContent(sessionId: string, fileId: string): Promise<string> {
  const res = await fetch(`${BASE}/file/${sessionId}/${fileId}`);
  if (!res.ok) return '';
  const data = await res.json() as { content: string };
  return data.content;
}

export function getReportUrl(sessionId: string) {
  return `${BASE}/report/${sessionId}/excel`;
}

export async function bulkFixStandard(sessionId: string, standardId: string) {
  const res = await fetch(`${BASE}/fix/bulk-standard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, standard_id: standardId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string; total_files: number; standard_id: string }>;
}

/** Push the dedicated fix branch (astra-codelens/fixes-<base>) to the remote. */
export async function pushFixes(sessionId: string) {
  const res = await fetch(`${BASE}/fix/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string; branch: string; pushed: boolean }>;
}

/** Re-run the (file, standard) checks that didn't complete (hard fail-closed retry). */
export async function retryCoverage(sessionId: string) {
  const res = await fetch(`${BASE}/review/retry-coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ status: string; retrying: number }>;
}

/** Resume fixing a prior review's open violations without re-running the full scan. */
export async function resumeFixing(repoUrl: string, branch: string, pat: string) {
  const res = await fetch(`${BASE}/fix/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, branch, pat }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ sessionId: string; streamUrl: string }>;
}

export async function browseRepo(repoUrl: string, branch: string, pat: string) {
  const res = await fetch(`${BASE}/repo/browse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, branch, pat }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ folders: Array<{ name: string; path: string; hasChildren: boolean }> }>;
}

export async function browseFolder(
  repoUrl: string,
  branch: string,
  pat: string,
  folderPath: string,
) {
  const res = await fetch(`${BASE}/repo/browse-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, branch, pat, folderPath }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    folders: Array<{ name: string; path: string; hasChildren: boolean; fileCount?: number }>;
    fileCount: number;
  }>;
}
