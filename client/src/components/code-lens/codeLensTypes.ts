export type ViolationSeverity = 'Critical' | 'Warning' | 'Info';
export type ViolationStatus = 'OPEN' | 'FIXED' | 'IGNORED' | 'DEFERRED';
export type StandardStatus = 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE' | 'ERROR';

export type RunStatus = 'COMPLETE' | 'PARTIAL' | 'STOPPED';

export interface CoverageInfo {
  expected_cells: number;
  verified_cells: number;
  error_cells: number;
  /** Overall review confidence = verified applicable checks ÷ applicable checks. */
  confidence_pct: number;
  applicable_cells: number;
  verified_applicable_cells: number;
  failed: Array<{ file_id: string; path: string; rule_id: string; rule_name: string }>;
}

export interface ParsedRule {
  rule_id: string;
  name: string;
  severity: ViolationSeverity;
}

export interface ViolationRecord {
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
  status: ViolationStatus;
}

export interface StandardCheckResult {
  rule_id: string;
  rule_name: string;
  severity: ViolationSeverity;
  status: StandardStatus;
  checked: string;
  violations: Array<{
    line: number;
    found_code: string;
    explanation: string;
  }>;
}

export interface FileRecord {
  file_id: string;
  path: string;
  critical: number;
  warning: number;
  info: number;
  passed: number;
  /** Applicable standards for this file (checks that should run). */
  applicableCells?: number;
  /** Applicable cells verified (non-error) — confidence = verified ÷ applicable. */
  verifiedCells?: number;
  status: 'REVIEWING' | 'PASS' | 'FAIL' | 'PENDING';
}

export interface ReviewSummary {
  total_files: number;
  total_violations: number;
  critical: number;
  warning: number;
  info: number;
  files_passing: number;
  files_failing: number;
  compliance_pct: number;
}

export interface FixPreview {
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

export interface DiscoveryBreakdown {
  test_files: number;
  build_output: number;
  generated: number;
  user_ignored: number;
}

export interface FilesDiscoveredEvent {
  event: 'files_discovered';
  session_id: string;
  total_found: number;
  scanning: number;
  ignored: number;
  ignored_breakdown: DiscoveryBreakdown;
}

// Repo-wide architecture / dependency graph (mirrors server codelens-arch-graph.ts)
export interface ArchitectureGraph {
  nodes: { id: string; label: string; layer: 'controller' | 'service' | 'repository' | 'data' | 'other'; file: string }[];
  edges: { from: string; to: string; viaInterface?: string; illegal?: boolean; reason?: string; standardId?: string }[];
  violations: { from: string; to: string; reason: string; standardId: string }[];
  mermaid: string;
  stats: {
    controllers: number; services: number; repositories: number; dataAccess: number;
    edges: number; illegalEdges: number; filesAnalyzed: number; truncated: boolean;
  };
}

export type CodeLensEvent =
  | { event: 'review_started'; session_id: string; total_files: number; total_rules: number; standards_source: string }
  | { event: 'standards_parsed'; rules: ParsedRule[]; total_rules: number }
  | FilesDiscoveredEvent
  | { event: 'file_started'; file_id: string; path: string; progress: { current: number; total: number } }
  | { event: 'rule_pass'; file_id: string; rule_id: string; rule_name: string }
  | ({ event: 'standard_checked' } & StandardCheckResult & { file_id: string })
  | ({ event: 'violation_found' } & ViolationRecord)
  | { event: 'file_complete'; file_id: string; path: string; summary: { critical: number; warning: number; info: number; passed: number; notApplicable?: number; errors?: number; applicableCells?: number; verifiedCells?: number; status: string } }
  | ({ event: 'fix_preview' } & FixPreview)
  | { event: 'fix_applied'; violation_id: string; file_id: string; rule_id: string; commit_message: string; branch: string }
  | { event: 'fix_verified'; violation_id: string; rule_id: string; verified: boolean; status: string; message: string }
  | { event: 'review_complete'; session_id: string; run_status: RunStatus; coverage: CoverageInfo; summary: ReviewSummary; report_ready: boolean; report_download_url: string }
  | { event: 'review_stopped'; session_id: string; files_reviewed: number; files_remaining: number }
  | { event: 'review_resumed'; session_id: string; resuming_from_file: string }
  | { event: 'review_status'; message: string }
  | { event: 'bulk_fix_progress'; standard_id: string; fixed: number; failed: number; total: number; current_file: string }
  | { event: 'bulk_fix_complete'; standard_id: string; fixed: number; failed: number; total: number }
  | { event: 'architecture_graph'; graph: ArchitectureGraph }
  | { event: 'error'; message: string };

export const SSE_EVENT_TYPES = [
  'review_started',
  'standards_parsed',
  'files_discovered',
  'file_started',
  'rule_pass',
  'standard_checked',
  'violation_found',
  'file_complete',
  'fix_preview',
  'fix_applied',
  'fix_verified',
  'review_complete',
  'review_stopped',
  'review_resumed',
  'review_status',
  'bulk_fix_progress',
  'bulk_fix_complete',
  'architecture_graph',
  'error',
] as const;
