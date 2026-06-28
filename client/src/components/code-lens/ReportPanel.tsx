import { Download, Bug, CheckCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import type { ReviewSummary, RunStatus, CoverageInfo } from './codeLensTypes';

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
}

export function ReportPanel({ summary, reportUrl, onReset, runStatus, coverage, onRetryCoverage, retrying, onBackToReview }: ReportPanelProps) {
  const handleDownload = () => {
    window.open(reportUrl, '_blank', 'noopener');
  };

  const isPartial = runStatus === 'PARTIAL' || (coverage?.error_cells ?? 0) > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: '#0A1628' }}>
      <div className="w-full max-w-2xl space-y-6">

        {/* Title */}
        <div className="flex items-center gap-3">
          {isPartial
            ? <AlertTriangle className="w-7 h-7" style={{ color: '#FFA500' }} />
            : <CheckCircle className="w-7 h-7" style={{ color: '#00A896' }} />}
          <h2 className="text-2xl font-bold text-white">
            {isPartial ? 'Review Incomplete' : runStatus === 'STOPPED' ? 'Review Stopped' : 'Review Complete'}
          </h2>
        </div>

        {/* Coverage / fail-closed banner */}
        {coverage && (
          <div className="rounded-xl border p-4"
               style={isPartial
                 ? { background: '#2A1A00', borderColor: '#FFA50055' }
                 : { background: '#0D2818', borderColor: '#1E5F3A' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm" style={{ color: isPartial ? '#FFC080' : '#A0D8C0' }}>
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
                  style={{ background: '#FFA50020', color: '#FFC080', border: '1px solid #FFA50055' }}
                >
                  {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {retrying ? 'Retrying…' : 'Retry unverified checks'}
                </button>
              )}
            </div>
            {isPartial && coverage.failed.length > 0 && (
              <div className="mt-2 max-h-28 overflow-y-auto space-y-0.5">
                {coverage.failed.slice(0, 20).map((f, i) => (
                  <div key={i} className="text-[11px] font-mono" style={{ color: '#7A9CC0' }}>
                    <span style={{ color: '#FFC080' }}>{f.rule_id}</span> · {f.path.split('/').pop()}
                  </div>
                ))}
                {coverage.error_cells > 20 && (
                  <div className="text-[11px]" style={{ color: '#4A6A8A' }}>
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
          const color = conf >= 100 ? '#00C896' : conf >= 90 ? '#FFC080' : '#FF8080';
          return (
            <div className="rounded-xl border p-5 flex items-center justify-between"
                 style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
              <div>
                <div className="text-sm font-semibold text-white">Review confidence</div>
                <div className="text-xs mt-0.5" style={{ color: '#7A9CC0' }}>
                  {coverage.verified_applicable_cells.toLocaleString()} of {coverage.applicable_cells.toLocaleString()} applicable checks verified
                </div>
                <div className="text-[11px] mt-1" style={{ color: '#4A6A8A' }}>
                  How completely the standards were checked — not a guarantee the code is defect-free.
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black" style={{ color }}>{conf}%</div>
                {conf < 100 && (
                  <div className="text-[11px] font-semibold" style={{ color: '#FFC080' }}>not fully verified</div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Main stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Compliance % */}
          <div className="col-span-1 rounded-xl border p-6 text-center"
               style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
            <div className="text-5xl font-black" style={{ color: '#00BFFF' }}>
              {summary.compliance_pct}%
            </div>
            <div className="text-sm mt-1" style={{ color: '#7A9CC0' }}>compliant</div>
          </div>

          {/* Files reviewed */}
          <div className="rounded-xl border p-6 text-center"
               style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
            <div className="text-4xl font-black text-white">{summary.total_files}</div>
            <div className="text-sm mt-1" style={{ color: '#7A9CC0' }}>files reviewed</div>
          </div>

          {/* Total violations */}
          <div className="rounded-xl border p-6 text-center"
               style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
            <div className="text-4xl font-black"
                 style={{ color: summary.total_violations > 0 ? '#FF8080' : '#80E0D0' }}>
              {summary.total_violations}
            </div>
            <div className="text-sm mt-1" style={{ color: '#7A9CC0' }}>violations</div>
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="rounded-xl border p-5 flex items-center justify-around"
             style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#FF4444' }} />
            <span className="text-sm font-medium" style={{ color: '#FF8080' }}>
              {summary.critical} Critical
            </span>
          </div>
          <div className="w-px h-6" style={{ background: '#1E3A5F' }} />
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#FFA500' }} />
            <span className="text-sm font-medium" style={{ color: '#FFC080' }}>
              {summary.warning} Warning
            </span>
          </div>
          <div className="w-px h-6" style={{ background: '#1E3A5F' }} />
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#00A896' }} />
            <span className="text-sm font-medium" style={{ color: '#80E0D0' }}>
              {summary.files_passing} Files Passing
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold"
            style={{ background: '#00BFFF', color: '#0A1628' }}
          >
            <Download className="w-4 h-4" />
            Download Excel Report
          </button>

          <button
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold border cursor-not-allowed"
            style={{ borderColor: '#1E3A5F', color: '#4A6A8A', background: 'transparent' }}
            title="ADO integration — available in Sprint 2"
          >
            <Bug className="w-4 h-4" />
            Create ADO Bugs for Critical Violations
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1E3A5F', color: '#7A9CC0' }}>
              Sprint 2
            </span>
          </button>

          {onBackToReview && (
            <button
              onClick={onBackToReview}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold border"
              style={{ borderColor: '#00BFFF55', color: '#00BFFF', background: 'transparent' }}
            >
              ← Back to review (fix violations)
            </button>
          )}

          <button
            onClick={onReset}
            className="text-sm text-center"
            style={{ color: '#4A6A8A' }}
          >
            ↻ New review (another repository)
          </button>
        </div>
      </div>
    </div>
  );
}
