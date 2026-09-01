const BASE = '/api/v1/codelens';

export interface RunSummary {
  runId: string;
  sessionId: string;
  repoUrl: string;
  branch: string;
  commitHash: string | null;
  startedAt: string;
  completedAt: string | null;
  status: string;
  scannedFiles: number;
  totalFiles: number;
  ignoredFiles: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passCount: number;
  compliancePct: number;
}

export interface FileResultRow {
  fileResultId: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passCount: number;
  naCount: number;
  compliancePct: number;
  status: string | null;
}

export interface RunDetail extends RunSummary {
  foldersScanned: string[] | null;
  ignorePatterns: string[] | null;
  fileResults: FileResultRow[];
}

export interface ViolationRow {
  violationId: string;
  filePath: string;
  fileName: string;
  standardId: string;
  standardName: string;
  severity: string;
  lineStart: number | null;
  lineEnd: number | null;
  foundCode: string | null;
  explanation: string | null;
  status: string | null;
  createdAt: string | null;
}

export interface StandardBreakdown {
  standardId: string;
  standardName: string;
  baselineViolations: number;
  latestViolations: number;
  delta: number;
  trend: 'IMPROVING' | 'REGRESSING' | 'STABLE';
}

export interface CompareResult {
  baseline: RunSummary;
  latest: RunSummary;
  delta: {
    compliancePct: number;
    critical: number;
    warning: number;
    filesImproved: number;
    filesRegressed: number;
    filesUnchanged: number;
    newViolations: Array<{ filePath: string; standardId: string; lineStart: number | null; foundCode: string | null }>;
    fixedViolations: Array<{ filePath: string; standardId: string; lineStart: number | null; foundCode: string | null }>;
    standardsBreakdown: StandardBreakdown[];
  };
}

/** Most recent runs across all repos — for the dashboard landing. */
export async function fetchRecentRuns(limit = 8): Promise<RunSummary[]> {
  const res = await fetch(`${BASE}/history/recent?limit=${limit}`);
  if (!res.ok) throw new Error(`Recent runs fetch failed: ${res.status}`);
  const data = await res.json();
  return data.runs as RunSummary[];
}

export interface StandardInfo {
  id: string;
  name: string;
  severity: 'Critical' | 'Warning' | 'Info';
  description: string;
  appliesTo: string;
  whatToLookFor?: string;
  notApplicableWhen?: string;
  custom?: boolean;
  enabled?: boolean;
}

export interface CustomStandardInput {
  name: string;
  severity: 'Critical' | 'Warning' | 'Info';
  description: string;
  whatToLookFor: string;
  appliesTo: string;
  notApplicableWhen?: string;
}

export async function fetchStandards(): Promise<{ total: number; builtinCount: number; customCount: number; standards: StandardInfo[] }> {
  const res = await fetch(`${BASE}/standards`);
  if (!res.ok) throw new Error(`Standards fetch failed: ${res.status}`);
  return res.json();
}

export async function createCustomStandard(input: CustomStandardInput): Promise<StandardInfo> {
  const res = await fetch(`${BASE}/standards`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).standard;
}

export async function updateCustomStandard(id: string, patch: Partial<CustomStandardInput & { enabled: boolean }>): Promise<StandardInfo> {
  const res = await fetch(`${BASE}/standards/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).standard;
}

export async function deleteCustomStandard(id: string): Promise<void> {
  const res = await fetch(`${BASE}/standards/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

/** Enable/disable any standard (built-in or custom) for the current user. */
export async function setStandardEnabled(id: string, enabled: boolean): Promise<StandardInfo> {
  const res = await fetch(`${BASE}/standards/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).standard;
}

/** Enable or disable all 42 built-in standards for the current user. */
export async function toggleAllBuiltins(enabled: boolean): Promise<{ enabled: boolean; count: number }> {
  const res = await fetch(`${BASE}/standards/builtins/toggle-all`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Import a standards document (any text format) as the current user's custom standards.
 *  mode 'replace' disables the built-ins + clears existing custom first. */
export async function importStandards(content: string, mode: 'replace' | 'augment'): Promise<{
  status: string; mode: string; parsed: number; imported: number; clearedCustom: number; builtinsDisabled: number;
}> {
  const res = await fetch(`${BASE}/standards/import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, mode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchRunHistory(repoUrl: string, branch: string, limit = 10): Promise<RunSummary[]> {
  const params = new URLSearchParams({ repoUrl, branch, limit: String(limit) });
  const res = await fetch(`${BASE}/history?${params}`);
  if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
  const data = await res.json();
  return data.runs as RunSummary[];
}

export async function fetchRunDetail(runId: string): Promise<RunDetail> {
  const res = await fetch(`${BASE}/runs/${runId}`);
  if (!res.ok) throw new Error(`Run detail fetch failed: ${res.status}`);
  return res.json() as Promise<RunDetail>;
}

export async function fetchRunViolations(runId: string, filePath?: string, severity?: string): Promise<ViolationRow[]> {
  const params = new URLSearchParams({ ...(filePath ? { filePath } : {}), ...(severity ? { severity } : {}) });
  const res = await fetch(`${BASE}/runs/${runId}/violations?${params}`);
  if (!res.ok) throw new Error(`Violations fetch failed: ${res.status}`);
  const data = await res.json();
  return data.violations as ViolationRow[];
}

export async function fetchCompare(runId1: string, runId2: string): Promise<CompareResult> {
  const params = new URLSearchParams({ runId1, runId2 });
  const res = await fetch(`${BASE}/compare?${params}`);
  if (!res.ok) throw new Error(`Compare fetch failed: ${res.status}`);
  return res.json() as Promise<CompareResult>;
}
