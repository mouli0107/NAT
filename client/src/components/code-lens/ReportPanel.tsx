import { Download, Bug, CheckCircle, AlertTriangle, RefreshCw, Loader2, Network } from 'lucide-react';
import type { ReviewSummary, RunStatus, CoverageInfo, ArchitectureGraph } from './codeLensTypes';
import { ArchitectureView } from './ArchitectureView';
import { ScoreDial } from './ScoreDial';

interface ReportPanelProps {
  summary: ReviewSummary;
  reportUrl: string;
  sessionId: string;
  onReset: () => void;
  runStatus?: RunStatus | null;
  coverage?: CoverageInfo | null;
  onRetryCoverage?: () => void;
  retrying?: boolean;
  /** Return to the review screen to continue fixing violations (session still live). */
  onBackToReview?: () => void;
  /** Repo-wide architecture/dependency graph (Controller → Service → Repository → DB). */
  architecture?: ArchitectureGraph | null;
  /** Code quality score (0-100) — shown as the headline dial. */
  score?: number | null;
}

export function ReportPanel({ summary, reportUrl, onReset, runStatus, coverage, onRetryCoverage, retrying, onBackToReview, architecture, score }: ReportPanelProps) {
  const handleDownload = () => {
    window.open(reportUrl, '_blank', 'noopener');
  };

  const isPartial = runStatus === 'PARTIAL' || (coverage?.error_cells ?? 0) > 0;

  return (
    <div className="cl-root w-full flex items-start justify-center p-6">
      <div className="w-full space-y-6 mx-auto" style={{ maxWidth: 1600 }}>

        {/* Headline: quality-score dial + title + industry metrics */}
        <div className="cl-glass" style={{ display: 'flex', alignItems: 'center', gap: 28, padding: 28 }}>
          {typeof score === 'number' && Number.isFinite(score) && (
            <div style={{ flexShrink: 0 }}>
              <ScoreDial score={score} size={168} label={summary.grade ? `Grade ${summary.grade}` : undefined} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div className="cl-eyebrow" style={{ marginBottom: 12 }}>
              <span className="dot" /> {isPartial ? 'Coverage incomplete' : 'Review complete'}
            </div>
            <h2 className="cl-grot" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
              {isPartial
                ? <>Review <span className="cl-grad">incomplete</span></>
                : runStatus === 'STOPPED'
                  ? <>Review <span className="cl-grad">stopped</span></>
                  : <>Your build's <span className="cl-grad">quality score</span></>}
            </h2>
            <p style={{ color: 'var(--cl-t1)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              Severity-weighted rule compliance (Critical 10 · Warning 3 · Info 1).
            </p>
            {/* Industry-standard metric strip */}
            <div style={{ display: 'flex', gap: 26, marginTop: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="cl-grot" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cl-t0)' }}>{summary.grade ?? '—'}</div>
                <div className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-t2)', textTransform: 'uppercase', letterSpacing: 1 }}>Grade</div>
              </div>
              <div>
                <div className="cl-grot" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cl-t0)' }}>
                  {summary.files_passing}/{summary.total_files}
                </div>
                <div className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-t2)', textTransform: 'uppercase', letterSpacing: 1 }}>Files passing</div>
              </div>
              <div>
                <div className="cl-grot" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cl-t0)' }}>
                  {summary.defect_density ?? 0}<span style={{ fontSize: 12, color: 'var(--cl-t2)' }}>/KLOC</span>
                </div>
                <div className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-t2)', textTransform: 'uppercase', letterSpacing: 1 }}>Defect density</div>
              </div>
              {coverage && (
                <div>
                  <div className="cl-grot" style={{ fontSize: 20, fontWeight: 700, color: 'var(--cl-t0)' }}>{coverage.confidence_pct}%</div>
                  <div className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-t2)', textTransform: 'uppercase', letterSpacing: 1 }}>Coverage</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coverage / fail-closed banner */}
        {coverage && (
          <div className="rounded-xl border p-4"
               style={isPartial
                 ? { background: '#fffbeb', borderColor: '#d9770655' }
                 : { background: '#ecfdf5', borderColor: '#a7f3d0' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm" style={{ color: isPartial ? '#d97706' : '#059669' }}>
                {isPartial ? (
                  <>
                    <strong>{coverage.error_cells.toLocaleString()}</strong> standard check(s) could not be verified —
                    this review is <strong>not complete</strong>. Compliance is not guaranteed until these are resolved.
                  </>
                ) : (
                  <>
                    ✓ All <strong>{coverage.verified_cells.toLocaleString()}</strong> applicable checks verified
                    ({coverage.expected_cells.toLocaleString()} expected).
                  </>
                )}
              </div>
              {isPartial && onRetryCoverage && (
                <button
                  onClick={onRetryCoverage}
                  disabled={retrying}
                  className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{ background: '#d9770620', color: '#d97706', border: '1px solid #d9770655' }}
                >
                  {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {retrying ? 'Retrying…' : 'Retry unverified checks'}
                </button>
              )}
            </div>
            {isPartial && coverage.failed.length > 0 && (
              <div className="mt-2 max-h-28 overflow-y-auto space-y-0.5">
                {coverage.failed.slice(0, 20).map((f, i) => (
                  <div key={i} className="text-[11px] font-mono" style={{ color: '#6b7280' }}>
                    <span style={{ color: '#d97706' }}>{f.rule_id}</span> · {f.path.split('/').pop()}
                  </div>
                ))}
                {coverage.error_cells > 20 && (
                  <div className="text-[11px]" style={{ color: '#9ca3af' }}>
                    …and {(coverage.error_cells - 20).toLocaleString()} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Review confidence — the headline trust number (coverage-based) */}
        {coverage && (() => {
          const conf = coverage.confidence_pct;
          const color = conf >= 100 ? '#059669' : conf >= 90 ? '#d97706' : '#dc2626';
          return (
            <div className="rounded-xl border p-5 flex items-center justify-between"
                 style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
              <div>
                <div className="text-sm font-semibold text-gray-900">Review confidence</div>
                <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  {coverage.verified_applicable_cells.toLocaleString()} of {coverage.applicable_cells.toLocaleString()} applicable checks verified
                </div>
                <div className="text-[11px] mt-1" style={{ color: '#9ca3af' }}>
                  How completely the standards were checked — not a guarantee the code is defect-free.
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black" style={{ color }}>{conf}%</div>
                {conf < 100 && (
                  <div className="text-[11px] font-semibold" style={{ color: '#d97706' }}>not fully verified</div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Main stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Compliance % */}
          <div className="col-span-1 rounded-xl border p-6 text-center"
               style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
            <div className="text-5xl font-black" style={{ color: '#2563eb' }}>
              {summary.compliance_pct}%
            </div>
            <div className="text-sm mt-1" style={{ color: '#6b7280' }}>compliant</div>
          </div>

          {/* Files reviewed */}
          <div className="rounded-xl border p-6 text-center"
               style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
            <div className="text-4xl font-black text-gray-900">{summary.total_files}</div>
            <div className="text-sm mt-1" style={{ color: '#6b7280' }}>files reviewed</div>
          </div>

          {/* Total violations */}
          <div className="rounded-xl border p-6 text-center"
               style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
            <div className="text-4xl font-black"
                 style={{ color: summary.total_violations > 0 ? '#dc2626' : '#059669' }}>
              {summary.total_violations}
            </div>
            <div className="text-sm mt-1" style={{ color: '#6b7280' }}>violations</div>
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="rounded-xl border p-5 flex items-center justify-around"
             style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#dc2626' }} />
            <span className="text-sm font-medium" style={{ color: '#dc2626' }}>
              {summary.critical} Critical
            </span>
          </div>
          <div className="w-px h-6" style={{ background: '#e5e7eb' }} />
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#d97706' }} />
            <span className="text-sm font-medium" style={{ color: '#d97706' }}>
              {summary.warning} Warning
            </span>
          </div>
          <div className="w-px h-6" style={{ background: '#e5e7eb' }} />
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#059669' }} />
            <span className="text-sm font-medium" style={{ color: '#059669' }}>
              {summary.files_passing} Files Passing
            </span>
          </div>
        </div>

        {/* Architecture & dependency graph (Controller → Service → Repository → DB) */}
        {architecture && architecture.nodes.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2 mb-1">
              <Network className="w-4 h-4" style={{ color: '#2563eb' }} />
              <h3 className="text-sm font-semibold text-gray-900">Architecture &amp; dependencies</h3>
            </div>
            <div className="text-[11px] mb-3" style={{ color: '#6b7280' }}>
              {architecture.stats.controllers} controllers · {architecture.stats.services} services · {architecture.stats.repositories} repositories · {architecture.stats.edges} dependencies
              {architecture.stats.illegalEdges > 0 && (
                <span style={{ color: '#dc2626' }}> · {architecture.stats.illegalEdges} illegal edge(s)</span>
              )}
              {architecture.stats.truncated && (
                <span style={{ color: '#9ca3af' }}> · showing first {architecture.nodes.length} nodes (large repo, truncated)</span>
              )}
            </div>
            <ArchitectureView graph={architecture} />
            {architecture.violations.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-[11px] font-semibold" style={{ color: '#dc2626' }}>
                  Layering violations (shown as red edges)
                </div>
                {architecture.violations.slice(0, 15).map((v, i) => (
                  <div key={i} className="text-[11px] font-mono" style={{ color: '#6b7280' }}>
                    <span style={{ color: '#dc2626' }}>{v.standardId}</span>{' '}
                    {v.from} → {v.to} — {v.reason}
                  </div>
                ))}
                {architecture.violations.length > 15 && (
                  <div className="text-[11px]" style={{ color: '#9ca3af' }}>
                    …and {architecture.violations.length - 15} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold"
            style={{ background: '#2563eb', color: '#f9fafb' }}
          >
            <Download className="w-4 h-4" />
            Download Excel Report
          </button>

          <button
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold border cursor-not-allowed"
            style={{ borderColor: '#e5e7eb', color: '#9ca3af', background: 'transparent' }}
            title="ADO integration — available in Sprint 2"
          >
            <Bug className="w-4 h-4" />
            Create ADO Bugs for Critical Violations
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#e5e7eb', color: '#6b7280' }}>
              Sprint 2
            </span>
          </button>

          {onBackToReview && (
            <button
              onClick={onBackToReview}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold border"
              style={{ borderColor: '#2563eb55', color: '#2563eb', background: 'transparent' }}
            >
              ← Back to review (fix violations)
            </button>
          )}

          <button
            onClick={onReset}
            className="text-sm text-center"
            style={{ color: '#9ca3af' }}
          >
            ↻ New review (another repository)
          </button>
        </div>
      </div>
    </div>
  );
}
