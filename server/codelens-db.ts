import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import {
  codelensRuns,
  codelensFileResults,
  codelensStandardResults,
  codelensViolations,
  codelensCheckCache,
  codelensSuppressions,
  codelensCustomStandards,
} from '@shared/schema';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunSummary {
  runId: string;
  sessionId: string;
  repoUrl: string;
  branch: string;
  commitHash: string | null;
  startedAt: Date;
  completedAt: Date | null;
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

export interface RunDetail extends RunSummary {
  foldersScanned: string[] | null;
  ignorePatterns: string[] | null;
  fileResults: FileResultRow[];
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
  createdAt: Date | null;
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

// ─── Write functions ──────────────────────────────────────────────────────────

export async function createRun(params: {
  sessionId: string;
  userId: string;
  repoUrl: string;
  branch: string;
  commitHash: string;
  foldersScanned: string[];
  ignorePatterns: string[];
}): Promise<string> {
  const rows = await db
    .insert(codelensRuns)
    .values({
      sessionId: params.sessionId,
      userId: params.userId,
      repoUrl: params.repoUrl,
      branch: params.branch,
      commitHash: params.commitHash,
      foldersScanned: params.foldersScanned,
      ignorePatterns: params.ignorePatterns,
      status: 'RUNNING',
    })
    .returning({ id: codelensRuns.id });
  return rows[0].id;
}

export async function saveFileResult(params: {
  runId: string;
  filePath: string;
  fileType: string;
  standardsChecked: number;
  critical: number;
  warning: number;
  info: number;
  pass: number;
  na: number;
  applicableCells?: number;
  verifiedCells?: number;
}): Promise<string> {
  const total = params.critical + params.warning + params.info + params.pass;
  const pct = total > 0
    ? ((params.pass / total) * 100).toFixed(2)
    : '100.00';
  const rows = await db
    .insert(codelensFileResults)
    .values({
      runId: params.runId,
      filePath: params.filePath,
      fileName: path.basename(params.filePath),
      fileType: params.fileType,
      standardsChecked: params.standardsChecked,
      criticalCount: params.critical,
      warningCount: params.warning,
      infoCount: params.info,
      passCount: params.pass,
      naCount: params.na,
      applicableCells: params.applicableCells ?? 0,
      verifiedCells: params.verifiedCells ?? 0,
      compliancePct: pct,
      status: (params.critical + params.warning + params.info > 0) ? 'FAIL' : 'PASS',
    })
    .returning({ id: codelensFileResults.id });
  return rows[0].id;
}

export async function saveStandardResult(params: {
  runId: string;
  fileResultId: string;
  filePath: string;
  standardId: string;
  standardName: string;
  severity: string;
  status: string;
  checked: string;
}): Promise<void> {
  await db.insert(codelensStandardResults).values({
    runId: params.runId,
    fileResultId: params.fileResultId,
    filePath: params.filePath,
    standardId: params.standardId,
    standardName: params.standardName,
    severity: params.severity,
    status: params.status,
    checked: params.checked,
  });
}

export async function saveViolation(params: {
  runId: string;
  fileResultId: string;
  violationId: string;
  filePath: string;
  standardId: string;
  standardName: string;
  severity: string;
  lineStart: number;
  lineEnd: number;
  foundCode: string;
  explanation: string;
}): Promise<void> {
  await db.insert(codelensViolations).values({
    runId: params.runId,
    fileResultId: params.fileResultId,
    violationId: params.violationId,
    filePath: params.filePath,
    fileName: path.basename(params.filePath),
    standardId: params.standardId,
    standardName: params.standardName,
    severity: params.severity,
    lineStart: params.lineStart,
    lineEnd: params.lineEnd,
    foundCode: params.foundCode,
    explanation: params.explanation,
    fixSuggestion: params.explanation,
    status: 'OPEN',
  });
}

// ─── Per-check verdict cache (content-hash keyed) ─────────────────────────────

export interface CachedCheck {
  status: 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE';
  checked: string;
  violations: Array<{ line: number; found_code: string; explanation: string }>;
}

/** Look up a cached verdict by composite key. Returns null on miss. */
export async function getCachedCheck(cacheKey: string): Promise<CachedCheck | null> {
  const rows = await db
    .select()
    .from(codelensCheckCache)
    .where(eq(codelensCheckCache.cacheKey, cacheKey))
    .limit(1);
  if (!rows.length) return null;
  // Refresh recency (fire-and-forget)
  db.update(codelensCheckCache)
    .set({ lastHitAt: new Date() })
    .where(eq(codelensCheckCache.cacheKey, cacheKey))
    .catch(() => {});
  const r = rows[0];
  return {
    status: r.status as CachedCheck['status'],
    checked: r.checked ?? '',
    violations: (r.violations as CachedCheck['violations']) ?? [],
  };
}

/** Store a verdict. Only terminal, non-error results should be cached. */
export async function putCachedCheck(params: {
  cacheKey: string;
  standardId: string;
  status: string;
  checked: string;
  violations: Array<{ line: number; found_code: string; explanation: string }>;
  checkerVersion: string;
}): Promise<void> {
  await db
    .insert(codelensCheckCache)
    .values({
      cacheKey: params.cacheKey,
      standardId: params.standardId,
      status: params.status,
      checked: params.checked,
      violations: params.violations,
      checkerVersion: params.checkerVersion,
    })
    .onConflictDoUpdate({
      target: codelensCheckCache.cacheKey,
      set: {
        status: params.status,
        checked: params.checked,
        violations: params.violations,
        checkerVersion: params.checkerVersion,
        lastHitAt: new Date(),
      },
    });
}

// ─── Custom (user-defined) standards ─────────────────────────────────────────

export interface CustomStandard {
  id: string;
  name: string;
  severity: 'Critical' | 'Warning' | 'Info';
  description: string;
  whatToLookFor: string;
  appliesTo: string;
  notApplicableWhen: string;
  enabled: boolean;
}

function rowToCustom(r: typeof codelensCustomStandards.$inferSelect): CustomStandard {
  return {
    id: r.id,
    name: r.name,
    severity: r.severity as CustomStandard['severity'],
    description: r.description,
    whatToLookFor: r.whatToLookFor,
    appliesTo: r.appliesTo,
    notApplicableWhen: r.notApplicableWhen ?? '',
    enabled: r.enabled,
  };
}

/** This user's custom standards (for the management UI). */
export async function listCustomStandards(userId: string): Promise<CustomStandard[]> {
  const rows = await db.select().from(codelensCustomStandards)
    .where(eq(codelensCustomStandards.userId, userId))
    .orderBy(codelensCustomStandards.id);
  return rows.map(rowToCustom);
}

/** This user's ENABLED custom standards — merged into the active set at review time. */
export async function getEnabledCustomStandards(userId: string): Promise<CustomStandard[]> {
  const rows = await db
    .select()
    .from(codelensCustomStandards)
    .where(and(eq(codelensCustomStandards.userId, userId), eq(codelensCustomStandards.enabled, true)))
    .orderBy(codelensCustomStandards.id);
  return rows.map(rowToCustom);
}

/** Create a custom standard owned by `userId`, id auto-assigned per user (C01, C02, …). */
export async function createCustomStandard(userId: string, input: {
  name: string; severity: string; description: string;
  whatToLookFor: string; appliesTo: string; notApplicableWhen: string;
}): Promise<CustomStandard> {
  // Per-user id space, but the column is the global PK — disambiguate with the user.
  const existing = await db.select({ id: codelensCustomStandards.id })
    .from(codelensCustomStandards).where(eq(codelensCustomStandards.userId, userId));
  const maxN = existing.reduce((m, r) => {
    const n = parseInt(String(r.id).replace(/^C\d*-?/i, '').replace(/^C/i, ''), 10);
    return !isNaN(n) && n > m ? n : m;
  }, 0);
  const id = `C${String(maxN + 1).padStart(2, '0')}-${userId.slice(0, 8)}`;
  const rows = await db.insert(codelensCustomStandards).values({
    id,
    userId,
    name: input.name,
    severity: input.severity,
    description: input.description,
    whatToLookFor: input.whatToLookFor,
    appliesTo: input.appliesTo,
    notApplicableWhen: input.notApplicableWhen,
  }).returning();
  return rowToCustom(rows[0]);
}

/** Update a custom standard — only if owned by `userId`. */
export async function updateCustomStandard(id: string, userId: string, patch: Partial<{
  name: string; severity: string; description: string;
  whatToLookFor: string; appliesTo: string; notApplicableWhen: string; enabled: boolean;
}>): Promise<CustomStandard | null> {
  const rows = await db.update(codelensCustomStandards)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(codelensCustomStandards.id, id), eq(codelensCustomStandards.userId, userId)))
    .returning();
  return rows.length ? rowToCustom(rows[0]) : null;
}

/** Delete a custom standard — only if owned by `userId`. */
export async function deleteCustomStandard(id: string, userId: string): Promise<void> {
  await db.delete(codelensCustomStandards)
    .where(and(eq(codelensCustomStandards.id, id), eq(codelensCustomStandards.userId, userId)));
}

// ─── Sticky suppressions (accepted/ignored findings) ─────────────────────────

/** Suppression keys for ONE user + repo — loaded at review start into a Set. */
export async function getSuppressionKeys(repoUrl: string, userId: string): Promise<string[]> {
  const rows = await db
    .select({ k: codelensSuppressions.suppKey })
    .from(codelensSuppressions)
    .where(and(eq(codelensSuppressions.repoUrl, repoUrl), eq(codelensSuppressions.userId, userId)));
  return rows.map(r => r.k);
}

/** Persist a suppression so the finding doesn't re-surface until its code changes. */
export async function addSuppression(params: {
  suppKey: string; userId: string; repoUrl: string; filePath: string; standardId: string; status: string;
}): Promise<void> {
  await db
    .insert(codelensSuppressions)
    .values({
      suppKey: params.suppKey,
      userId: params.userId,
      repoUrl: params.repoUrl,
      filePath: params.filePath,
      standardId: params.standardId,
      status: params.status,
    })
    .onConflictDoNothing();
}

/** Remove a suppression (un-ignore). */
export async function removeSuppression(suppKey: string): Promise<void> {
  await db.delete(codelensSuppressions).where(eq(codelensSuppressions.suppKey, suppKey));
}

/** Mark a violation FIXED in the DB and record the commit that fixed it. */
export async function markViolationFixed(params: {
  runId: string;
  violationId: string;
  commitHash: string | null;
}): Promise<void> {
  await db
    .update(codelensViolations)
    .set({
      status: 'FIXED',
      fixedAt: new Date(),
      fixedCommit: params.commitHash ?? null,
    })
    .where(and(
      eq(codelensViolations.runId, params.runId),
      eq(codelensViolations.violationId, params.violationId),
    ));
}

/** Mark a violation IGNORED/DEFERRED in the DB (no commit). */
export async function setViolationStatus(params: {
  runId: string;
  violationId: string;
  status: string; // 'OPEN' | 'IGNORED' | 'DEFERRED'
}): Promise<void> {
  await db
    .update(codelensViolations)
    .set({ status: params.status })
    .where(and(
      eq(codelensViolations.runId, params.runId),
      eq(codelensViolations.violationId, params.violationId),
    ));
}

/**
 * Find the most recent completed/stopped run for a repo+branch that still has
 * OPEN violations. Used to resume fixing in a fresh session without re-running
 * the full review. Returns null if there is nothing left to fix.
 */
export async function getLatestResumableRun(
  repoUrl: string,
  branch: string,
  userId: string,
): Promise<{ run: RunSummary; openViolations: ViolationRow[] } | null> {
  const runRows = await db
    .select()
    .from(codelensRuns)
    .where(and(
      eq(codelensRuns.repoUrl, repoUrl),
      eq(codelensRuns.branch, branch),
      eq(codelensRuns.userId, userId),
    ))
    .orderBy(desc(codelensRuns.startedAt))
    .limit(1);
  if (!runRows.length) return null;

  const run = toRunSummary(runRows[0]);

  const vRows = await db
    .select()
    .from(codelensViolations)
    .where(and(
      eq(codelensViolations.runId, run.runId),
      eq(codelensViolations.status, 'OPEN'),
    ))
    .orderBy(codelensViolations.severity, codelensViolations.filePath);

  const openViolations: ViolationRow[] = vRows.map(r => ({
    violationId: r.violationId,
    filePath: r.filePath,
    fileName: r.fileName,
    standardId: r.standardId,
    standardName: r.standardName,
    severity: r.severity,
    lineStart: r.lineStart ?? null,
    lineEnd: r.lineEnd ?? null,
    foundCode: r.foundCode ?? null,
    explanation: r.explanation ?? null,
    status: r.status ?? null,
    createdAt: r.createdAt ?? null,
  }));

  return { run, openViolations };
}

/**
 * Data shape consumed by the Excel export, structurally compatible with the
 * in-memory session. Used as a fallback so export/report works even after the
 * session is gone (server restart, TTL purge) or the review was stopped/cancelled.
 * Everything is keyed by filePath (used as the synthetic fileId).
 */
export interface ExportData {
  files: { fileId: string; relativePath: string }[];
  violations: Map<string, {
    fileId: string; ruleId: string; ruleName: string; severity: string;
    lineStart: number; foundCode: string; recommendedFix: string; status: string;
  }>;
  fileSummaries: Map<string, {
    critical: number; warning: number; info: number; passed: number;
    notApplicable: number; errors: number; applicableCells: number; verifiedCells: number;
    status: 'PASS' | 'FAIL';
  }>;
  standardResults: { fileId: string; ruleId: string; status: string; violationCount: number }[];
}

/** Build Excel-export data for a session straight from the DB (no in-memory state). */
export async function getRunExportDataBySessionId(sessionId: string, userId: string): Promise<ExportData | null> {
  const runRows = await db
    .select()
    .from(codelensRuns)
    .where(and(eq(codelensRuns.sessionId, sessionId), eq(codelensRuns.userId, userId)))  // ownership
    .limit(1);
  if (!runRows.length) return null;
  const runId = runRows[0].id;

  const [fileRows, vRows, stdRows] = await Promise.all([
    db.select().from(codelensFileResults).where(eq(codelensFileResults.runId, runId)),
    db.select().from(codelensViolations).where(eq(codelensViolations.runId, runId)),
    db.select().from(codelensStandardResults).where(eq(codelensStandardResults.runId, runId)),
  ]);

  const files = fileRows.map(r => ({ fileId: r.filePath, relativePath: r.filePath }));

  const fileSummaries: ExportData['fileSummaries'] = new Map();
  for (const r of fileRows) {
    fileSummaries.set(r.filePath, {
      critical: r.criticalCount ?? 0,
      warning: r.warningCount ?? 0,
      info: r.infoCount ?? 0,
      passed: r.passCount ?? 0,
      notApplicable: r.naCount ?? 0,
      errors: Math.max(0, (r.applicableCells ?? 0) - (r.verifiedCells ?? 0)),
      applicableCells: r.applicableCells ?? 0,
      verifiedCells: r.verifiedCells ?? 0,
      status: (r.status === 'PASS' ? 'PASS' : 'FAIL'),
    });
  }

  const violations: ExportData['violations'] = new Map();
  for (const v of vRows) {
    violations.set(v.violationId, {
      fileId: v.filePath,
      ruleId: v.standardId,
      ruleName: v.standardName,
      severity: v.severity,
      lineStart: v.lineStart ?? 0,
      foundCode: v.foundCode ?? '',
      recommendedFix: v.fixSuggestion ?? v.explanation ?? '',
      status: (v.status ?? 'OPEN').toLowerCase(),
    });
  }

  const standardResults = stdRows.map(r => ({
    fileId: r.filePath,
    ruleId: r.standardId,
    status: r.status,
    violationCount: r.status === 'VIOLATION' ? 1 : 0,
  }));

  return { files, violations, fileSummaries, standardResults };
}

export async function completeRun(params: {
  runId: string;
  status: string;
  totalFiles: number;
  scannedFiles: number;
  ignoredFiles: number;
  critical: number;
  warning: number;
  info: number;
  pass: number;
  compliancePct: number;
}): Promise<void> {
  await db
    .update(codelensRuns)
    .set({
      status: params.status,
      completedAt: new Date(),
      totalFiles: params.totalFiles,
      scannedFiles: params.scannedFiles,
      ignoredFiles: params.ignoredFiles,
      criticalCount: params.critical,
      warningCount: params.warning,
      infoCount: params.info,
      passCount: params.pass,
      compliancePct: params.compliancePct.toFixed(2),
    })
    .where(eq(codelensRuns.id, params.runId));
}

// ─── Read functions ───────────────────────────────────────────────────────────

function toRunSummary(row: typeof codelensRuns.$inferSelect): RunSummary {
  return {
    runId: row.id,
    sessionId: row.sessionId,
    repoUrl: row.repoUrl,
    branch: row.branch,
    commitHash: row.commitHash ?? null,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? null,
    status: row.status,
    scannedFiles: row.scannedFiles ?? 0,
    totalFiles: row.totalFiles ?? 0,
    ignoredFiles: row.ignoredFiles ?? 0,
    criticalCount: row.criticalCount ?? 0,
    warningCount: row.warningCount ?? 0,
    infoCount: row.infoCount ?? 0,
    passCount: row.passCount ?? 0,
    compliancePct: parseFloat(row.compliancePct ?? '0'),
  };
}

/** Most recent runs for ONE user — powers the dashboard landing (per-user). */
export async function getRecentRuns(userId: string, limit = 8): Promise<RunSummary[]> {
  const rows = await db
    .select()
    .from(codelensRuns)
    .where(eq(codelensRuns.userId, userId))
    .orderBy(desc(codelensRuns.startedAt))
    .limit(limit);
  return rows.map(toRunSummary);
}

export async function getRunHistory(
  repoUrl: string,
  branch: string,
  userId: string,
  limit = 10,
): Promise<RunSummary[]> {
  const rows = await db
    .select()
    .from(codelensRuns)
    .where(and(
      eq(codelensRuns.repoUrl, repoUrl),
      eq(codelensRuns.branch, branch),
      eq(codelensRuns.userId, userId),
    ))
    .orderBy(desc(codelensRuns.startedAt))
    .limit(limit);
  return rows.map(toRunSummary);
}

export async function getRunDetail(runId: string, userId: string): Promise<RunDetail | null> {
  const runRows = await db
    .select()
    .from(codelensRuns)
    .where(and(eq(codelensRuns.id, runId), eq(codelensRuns.userId, userId)))  // ownership
    .limit(1);
  if (!runRows.length) return null;

  const fileRows = await db
    .select()
    .from(codelensFileResults)
    .where(eq(codelensFileResults.runId, runId))
    .orderBy(desc(codelensFileResults.criticalCount));

  const fileResults: FileResultRow[] = fileRows.map(r => ({
    fileResultId: r.id,
    filePath: r.filePath,
    fileName: r.fileName,
    fileType: r.fileType ?? null,
    criticalCount: r.criticalCount ?? 0,
    warningCount: r.warningCount ?? 0,
    infoCount: r.infoCount ?? 0,
    passCount: r.passCount ?? 0,
    naCount: r.naCount ?? 0,
    compliancePct: parseFloat(r.compliancePct ?? '0'),
    status: r.status ?? null,
  }));

  const run = runRows[0];
  return {
    ...toRunSummary(run),
    foldersScanned: run.foldersScanned ?? null,
    ignorePatterns: run.ignorePatterns ?? null,
    fileResults,
  };
}

export async function getRunViolations(
  runId: string,
  userId: string,
  filePath?: string,
  severity?: string,
): Promise<ViolationRow[]> {
  // Ownership: only return violations if the run belongs to this user.
  const owns = await db.select({ id: codelensRuns.id }).from(codelensRuns)
    .where(and(eq(codelensRuns.id, runId), eq(codelensRuns.userId, userId))).limit(1);
  if (!owns.length) return [];

  const conditions = [eq(codelensViolations.runId, runId)];
  if (filePath) conditions.push(eq(codelensViolations.filePath, filePath));
  if (severity) conditions.push(eq(codelensViolations.severity, severity));

  const rows = await db
    .select()
    .from(codelensViolations)
    .where(and(...conditions))
    .orderBy(codelensViolations.severity, codelensViolations.filePath);

  return rows.map(r => ({
    violationId: r.violationId,
    filePath: r.filePath,
    fileName: r.fileName,
    standardId: r.standardId,
    standardName: r.standardName,
    severity: r.severity,
    lineStart: r.lineStart ?? null,
    lineEnd: r.lineEnd ?? null,
    foundCode: r.foundCode ?? null,
    explanation: r.explanation ?? null,
    status: r.status ?? null,
    createdAt: r.createdAt ?? null,
  }));
}

// ─── Comparison ───────────────────────────────────────────────────────────────

export async function compareRuns(runId1: string, runId2: string, userId: string): Promise<CompareResult | null> {
  const [run1rows, run2rows] = await Promise.all([
    db.select().from(codelensRuns).where(and(eq(codelensRuns.id, runId1), eq(codelensRuns.userId, userId))).limit(1),
    db.select().from(codelensRuns).where(and(eq(codelensRuns.id, runId2), eq(codelensRuns.userId, userId))).limit(1),
  ]);
  if (!run1rows.length || !run2rows.length) return null; // not found or not owned

  const baseline = toRunSummary(run1rows[0]);
  const latest   = toRunSummary(run2rows[0]);

  // Fetch all violations for both runs
  const [v1rows, v2rows] = await Promise.all([
    db.select().from(codelensViolations).where(eq(codelensViolations.runId, runId1)),
    db.select().from(codelensViolations).where(eq(codelensViolations.runId, runId2)),
  ]);

  // Key for identifying the same violation across runs
  const vKey = (v: { filePath: string; standardId: string; lineStart: number | null }) =>
    `${v.filePath}::${v.standardId}::${v.lineStart ?? 0}`;

  const baselineKeys = new Set(v1rows.map(vKey));
  const latestKeys   = new Set(v2rows.map(vKey));

  const fixedViolations = v1rows
    .filter(v => !latestKeys.has(vKey(v)))
    .map(v => ({ filePath: v.filePath, standardId: v.standardId, lineStart: v.lineStart, foundCode: v.foundCode }));

  const newViolations = v2rows
    .filter(v => !baselineKeys.has(vKey(v)))
    .map(v => ({ filePath: v.filePath, standardId: v.standardId, lineStart: v.lineStart, foundCode: v.foundCode }));

  // Per-file comparison
  const [fr1rows, fr2rows] = await Promise.all([
    db.select().from(codelensFileResults).where(eq(codelensFileResults.runId, runId1)),
    db.select().from(codelensFileResults).where(eq(codelensFileResults.runId, runId2)),
  ]);

  const baselineFileMap = new Map(fr1rows.map(r => [r.filePath, (r.criticalCount ?? 0) + (r.warningCount ?? 0)]));
  const latestFileMap   = new Map(fr2rows.map(r => [r.filePath, (r.criticalCount ?? 0) + (r.warningCount ?? 0)]));

  const allFilePaths = new Set([...Array.from(baselineFileMap.keys()), ...Array.from(latestFileMap.keys())]);
  let filesImproved = 0, filesRegressed = 0, filesUnchanged = 0;

  for (const fp of Array.from(allFilePaths)) {
    const b = baselineFileMap.get(fp) ?? 0;
    const l = latestFileMap.get(fp) ?? 0;
    if (l < b)      filesImproved++;
    else if (l > b) filesRegressed++;
    else            filesUnchanged++;
  }

  // Per-standard breakdown
  const allStandardIds = new Set([
    ...v1rows.map(v => v.standardId),
    ...v2rows.map(v => v.standardId),
  ]);
  const standardNameMap = new Map([
    ...v1rows.map(v => [v.standardId, v.standardName] as [string, string]),
    ...v2rows.map(v => [v.standardId, v.standardName] as [string, string]),
  ]);

  const standardsBreakdown: StandardBreakdown[] = Array.from(allStandardIds)
    .map(sid => {
      const bCount = v1rows.filter(v => v.standardId === sid).length;
      const lCount = v2rows.filter(v => v.standardId === sid).length;
      const delta  = lCount - bCount;
      return {
        standardId: sid,
        standardName: standardNameMap.get(sid) ?? sid,
        baselineViolations: bCount,
        latestViolations: lCount,
        delta,
        trend: delta < 0 ? 'IMPROVING' : delta > 0 ? 'REGRESSING' : 'STABLE',
      } as StandardBreakdown;
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    baseline,
    latest,
    delta: {
      compliancePct: latest.compliancePct - baseline.compliancePct,
      critical: latest.criticalCount - baseline.criticalCount,
      warning: latest.warningCount - baseline.warningCount,
      filesImproved,
      filesRegressed,
      filesUnchanged,
      newViolations,
      fixedViolations,
      standardsBreakdown,
    },
  };
}
