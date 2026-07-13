import type { Response } from 'express';
import type { ArchitectureGraph } from './codelens-arch-graph';

export type ViolationSeverity = 'Critical' | 'Warning' | 'Info';
export type SessionStatus = 'pending' | 'cloning' | 'running' | 'stopped' | 'complete' | 'error';
export type ViolationStatus = 'open' | 'fixed' | 'ignored' | 'deferred';

export type StandardScope =
  | 'all' | 'controller' | 'service' | 'repository' | 'dto'
  | 'migration' | 'program' | 'infrastructure' | 'non-migration';

/** A coding standard — built-in (code-defined) or custom (user-defined, from DB). */
export interface CodeStandard {
  id: string;
  name: string;
  severity: ViolationSeverity;
  description: string;
  whatToLookFor: string;
  appliesTo: StandardScope;
  notApplicableWhen: string;
  /** true for user-added standards (editable); false/undefined for the 42 built-ins. */
  custom?: boolean;
}

export interface FileEntry {
  fileId: string;
  relativePath: string;
  absolutePath: string;
}

export interface ViolationRecord {
  violationId: string;
  fileId: string;
  ruleId: string;
  ruleName: string;
  severity: ViolationSeverity;
  lineStart: number;
  lineEnd: number;
  foundCode: string;
  recommendedFix: string;
  fixAvailable: boolean;
  status: ViolationStatus;
}

export interface FixRecord {
  violationId: string;
  fileId: string;
  relativePath: string;
  absolutePath: string;
  beforeCode: string;
  afterCode: string;
  beforeLines: number[];
  importsAdded: string[];
  importsRemoved: string[];
  fixedContent: string;
}

export interface FileSummary {
  critical: number;
  warning: number;
  info: number;
  passed: number;
  notApplicable: number;
  /** Cells that could not be verified (fail-closed). >0 ⇒ file not fully reviewed. */
  errors: number;
  /** Standards that apply to this file (the checks that should run). */
  applicableCells: number;
  /** Applicable cells that got a verified (non-error) verdict. */
  verifiedCells: number;
  status: 'PASS' | 'FAIL';
}

// Standard-check result stored per file on the session (for Sheet 3 aggregation)
export interface FileStandardResult {
  fileId: string;
  ruleId: string;
  status: 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE' | 'ERROR';
  violationCount: number;
}

/** An (file, standard) cell whose check did not complete — keeps the run PARTIAL until retried. */
export interface CoverageErrorCell {
  fileId: string;
  filePath: string;
  ruleId: string;
  ruleName: string;
}

// ─── SSE event shapes ────────────────────────────────────────────────────────

export interface SseReviewStarted {
  event: 'review_started';
  session_id: string;
  total_files: number;
  total_rules: number;
  standards_source: string;
}

export interface SseStandardsParsed {
  event: 'standards_parsed';
  rules: Array<{ rule_id: string; name: string; severity: ViolationSeverity }>;
  total_rules: number;
}

export interface SseFileStarted {
  event: 'file_started';
  file_id: string;
  path: string;
  progress: { current: number; total: number };
}

export interface SseRulePass {
  event: 'rule_pass';
  file_id: string;
  rule_id: string;
  rule_name: string;
}

export interface SseStandardChecked {
  event: 'standard_checked';
  file_id: string;
  rule_id: string;
  rule_name: string;
  severity: ViolationSeverity;
  status: 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE' | 'ERROR';
  checked: string;
  violations: Array<{ line: number; found_code: string; explanation: string }>;
}

export interface SseViolationFound {
  event: 'violation_found';
  violation_id: string;
  file_id: string;
  rule_id: string;
  rule_name: string;
  severity: ViolationSeverity;
  line_start: number;
  line_end: number;
  found_code: string;
  recommended_fix: string;
  fix_available: boolean;
  // IGNORED = matched a sticky suppression from a prior review (accepted exception).
  status: 'OPEN' | 'IGNORED';
}

/** Result of re-checking a just-applied fix against its standard (verify-and-freeze). */
export interface SseFixVerified {
  event: 'fix_verified';
  violation_id: string;
  rule_id: string;
  verified: boolean;       // true ⇒ the standard now passes on the fixed file
  status: 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE' | 'ERROR';
  message: string;
}

export interface SseFileComplete {
  event: 'file_complete';
  file_id: string;
  path: string;
  summary: FileSummary;
}

export interface SseFixPreview {
  event: 'fix_preview';
  violation_id: string;
  file_id: string;
  diff: {
    before_lines: number[];
    before_code: string;
    after_code: string;
    imports_added: string[];
    imports_removed: string[];
  };
}

export interface SseFixApplied {
  event: 'fix_applied';
  violation_id: string;
  file_id: string;
  rule_id: string;
  commit_message: string;
  branch: string;
}

export interface SseReviewComplete {
  event: 'review_complete';
  session_id: string;
  /** COMPLETE = every applicable (file,standard) cell verified. PARTIAL = some cells
   *  errored/unverified (hard fail-closed). STOPPED = halted before all files reviewed. */
  run_status: 'COMPLETE' | 'PARTIAL' | 'STOPPED';
  coverage: {
    expected_cells: number;   // files × standards expected
    verified_cells: number;   // cells with a terminal non-error verdict
    error_cells: number;      // cells that could not be verified
    /** Overall review-confidence = verified applicable checks ÷ applicable checks, across reviewed files. */
    confidence_pct: number;
    applicable_cells: number;          // Σ applicable standards across reviewed files
    verified_applicable_cells: number; // Σ applicable cells verified (non-error)
    /** First N unverified cells, for display + retry */
    failed: Array<{ file_id: string; path: string; rule_id: string; rule_name: string }>;
  };
  summary: {
    total_files: number;
    total_violations: number;
    critical: number;
    warning: number;
    info: number;
    files_passing: number;
    files_failing: number;
    compliance_pct: number;
  };
  report_ready: boolean;
  report_download_url: string;
}

export interface SseFilesDiscovered {
  event: 'files_discovered';
  session_id: string;
  total_found: number;
  scanning: number;
  ignored: number;
  ignored_breakdown: {
    test_files: number;
    build_output: number;
    generated: number;
    user_ignored: number;
  };
}

export interface SseReviewStopped {
  event: 'review_stopped';
  session_id: string;
  files_reviewed: number;
  files_remaining: number;
}

export interface SseReviewResumed {
  event: 'review_resumed';
  session_id: string;
  resuming_from_file: string;
}

/** Repo-wide architecture/dependency graph (Controller → Service → Repository → DB),
 *  emitted once at review completion. Layered overview + flagged illegal edges. */
export interface SseArchitectureGraph {
  event: 'architecture_graph';
  graph: ArchitectureGraph;
}

// ─── Loop engineering (goal-based review loop) ───────────────────────────────

/** What the loop is trying to reach before it stops iterating. */
export type LoopGoalPolicy =
  | 'full_coverage'                 // ledger COMPLETE (every applicable cell verified)
  | 'zero_blocker'                  // no open Critical violations
  | 'zero_blocker_full_coverage';   // both of the above

/** Why the loop stopped iterating. */
export type LoopStopReason =
  | 'goal_met'
  | 'max_iterations'
  | 'timeout'
  | 'no_progress'      // the target metric stopped improving for N iterations
  | 'oscillation'      // a previously-reverted change was re-proposed (Phase 2)
  | 'stopped'          // user halted the run
  | 'error';

/** Ledger-derived snapshot taken after each iteration. Completeness is read from
 *  the coverage ledger, NOT session.status (finalizeRun collapses PARTIAL→stopped). */
export interface LoopMetric {
  runStatus: 'COMPLETE' | 'PARTIAL';
  criticalOpen: number;
  warningOpen: number;
  infoOpen: number;
  openViolations: number;
  errorCells: number;
  confidencePct: number;
}

/** Review-only loop vs. remediate-and-reconverge (Conform Mode). */
export type LoopMode = 'review' | 'conform';

export interface SseLoopStarted {
  event: 'loop_started';
  session_id: string;
  mode: LoopMode;
  policy: LoopGoalPolicy;
  budgets: { max_iterations: number; max_wall_clock_ms: number; no_progress_iterations: number };
}

export interface SseLoopIteration {
  event: 'loop_iteration';
  session_id: string;
  iteration: number;                                    // 1-based
  action: 'review' | 'retry_coverage' | 'remediate';
  metric: LoopMetric;
  goal_met: boolean;
  elapsed_ms: number;
}

/** A generated fix was screened against the Accepted-Deviations authority table.
 *  allowed=false ⇒ the fix would INTRODUCE a banned pattern and was NOT applied. */
export interface SseFixScreened {
  event: 'fix_screened';
  session_id: string;
  violation_id: string;
  allowed: boolean;
  deviation_id: string | null;   // e.g. 'A3' when rejected; null when allowed
  evidence: string;              // the offending snippet, or '' when allowed
}

/** Conform remediation pass summary (one per loop iteration that remediates). */
export interface SseConformProgress {
  event: 'conform_progress';
  session_id: string;
  iteration: number;
  attempted: number;   // violations we tried to fix this pass
  fixed: number;       // fixes generated, screened-clean, applied + verified
  deferred: number;    // skipped by the authority gate (would violate a deviation)
  failed: number;      // generation/apply errors
}

export interface SseLoopComplete {
  event: 'loop_complete';
  session_id: string;
  stop_reason: LoopStopReason;
  iterations: number;
  final_metric: LoopMetric;
}

export interface SseError {
  event: 'error';
  message: string;
}

/** Generic status/phase update — shown while waiting for slow operations (clone, discovery). */
export interface SseReviewStatus {
  event: 'review_status';
  message: string;
}

export interface SseBulkFixProgress {
  event: 'bulk_fix_progress';
  standard_id: string;
  fixed: number;
  failed: number;
  total: number;
  current_file: string;
}

export interface SseBulkFixComplete {
  event: 'bulk_fix_complete';
  standard_id: string;
  fixed: number;
  failed: number;
  total: number;
}

export type SseEvent =
  | SseReviewStarted
  | SseStandardsParsed
  | SseFilesDiscovered
  | SseFileStarted
  | SseRulePass
  | SseStandardChecked
  | SseViolationFound
  | SseFileComplete
  | SseFixPreview
  | SseFixApplied
  | SseFixVerified
  | SseReviewComplete
  | SseReviewStopped
  | SseReviewResumed
  | SseReviewStatus
  | SseBulkFixProgress
  | SseBulkFixComplete
  | SseArchitectureGraph
  | SseLoopStarted
  | SseLoopIteration
  | SseLoopComplete
  | SseFixScreened
  | SseConformProgress
  | SseError;

// ─── Session ─────────────────────────────────────────────────────────────────

export interface CodeLensSession {
  sessionId: string;
  /** Owner of this session — used to isolate clone dir, fix branch, history,
   *  suppressions, and custom standards per user. */
  userId: string;
  repoUrl: string;
  branch: string;
  localPath: string;
  status: SessionStatus;
  files: FileEntry[];
  violations: Map<string, ViolationRecord>;
  fixes: Map<string, FixRecord>;
  fileSummaries: Map<string, FileSummary>;
  /** Per-file per-standard results — used for Sheet 3 aggregation */
  standardResults: FileStandardResult[];
  sseClients: Set<Response>;
  eventHistory: SseEvent[];
  createdAt: number;
  totalFiles: number;
  /** Index of the last completed batch end — used for resume */
  lastReviewedFileIndex: number;
  /** Folders to scan; empty = entire repo */
  folders: string[];
  /** Optional allow-list of repo-relative paths to review (PR-triggered runs scope
   *  to changed files). Empty/undefined = no restriction. Applied AFTER folder +
   *  ignore filters as an intersection. */
  restrictToFiles?: string[];
  /** User-supplied ignore patterns (in addition to built-in defaults) */
  ignorePatterns: string[];
  /** DB run UUID — set once createRun() resolves */
  runId: string | null;
  /** Map from in-memory fileId → DB file_result UUID */
  fileResultIds: Map<string, string>;
  /** Commit hash of the HEAD being reviewed */
  commitHash: string;
  /** Dedicated fix branch (astra-codelens/fixes-<base>); null until first fix is applied */
  fixBranch: string | null;
  /** True once the fix branch has been pushed to origin at least once */
  fixBranchPushed: boolean;

  // ─── Coverage ledger (fail-closed completeness guarantee) ─────────────────────
  /** Total (file × standard) cells expected across reviewed files */
  coverageExpected: number;
  /** Cells with a terminal, non-error verdict (PASS/VIOLATION/NOT_APPLICABLE) */
  coverageVerified: number;
  /** Cells whose check did not complete — keyed `${fileId}::${ruleId}`. Non-empty ⇒ run is PARTIAL. */
  coverageErrors: Map<string, CoverageErrorCell>;
  /** Sticky suppression keys (accepted/ignored findings) for this repo — loaded at
   *  review start so previously-accepted violations don't re-surface as OPEN. */
  suppressions: Set<string>;
  /** Effective standards for this run = built-in 42 + enabled custom standards.
   *  Loaded at review start; empty until then (callers fall back to built-ins). */
  activeStandards: CodeStandard[];
  /** Per-controller review flows (Controller → Service → Repository → DB), in the
   *  order files are reviewed. Contiguous index ranges over the (reordered) files
   *  array; the review walks one flow fully before starting the next. Empty until
   *  the architecture graph is built at review start. */
  reviewFlows: { label: string; start: number; end: number }[];
}
