import { Square, Play, X, FileSpreadsheet, CheckCircle, Plus } from 'lucide-react';

export type ReviewStatus = 'running' | 'stopped' | 'complete';

interface ReviewProgressProps {
  currentFile: string;
  statusMessage?: string;
  progress: { current: number; total: number };
  stats: { critical: number; warning: number; passed: number };
  reviewStatus: ReviewStatus;
  onStop: () => void;
  onResume: () => void;
  onCancel: () => void;
  onViewReport: () => void;
  onNewReview: () => void;
}

export function ReviewProgress({
  currentFile,
  statusMessage,
  progress,
  stats,
  reviewStatus,
  onStop,
  onResume,
  onCancel,
  onViewReport,
  onNewReview,
}: ReviewProgressProps) {
  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // Compliance = passed ÷ (passed + critical + warning) over checks that have a
  // real pass/fail verdict so far. Until at least one such verdict exists it is
  // UNDEFINED — never show a placeholder 100% (N/A-only results don't count).
  const decided = stats.critical + stats.warning + stats.passed;
  const compliancePct: number | null = decided > 0
    ? Math.round((stats.passed / decided) * 100)
    : null;

  return (
    <div className="px-4 py-3 border-b space-y-2"
         style={{ background: '#0A1628', borderColor: '#1E3A5F' }}>

      {/* Top row: file name, count, compliance, controls */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: '#A0C0D8' }}>
          {reviewStatus === 'complete' ? (
            <span className="font-semibold flex items-center gap-1" style={{ color: '#00C896' }}>
              <CheckCircle className="w-3.5 h-3.5" /> Review complete — fix violations below, or view the report
            </span>
          ) : reviewStatus === 'stopped' ? (
            <span className="font-semibold" style={{ color: '#FFA500' }}>⏸ Review paused</span>
          ) : statusMessage ? (
            <span className="font-mono" style={{ color: '#00BFFF' }}>
              <span className="inline-block animate-spin mr-1">⟳</span>
              {statusMessage}
            </span>
          ) : (
            <>
              Reviewing{' '}
              <span className="font-mono font-medium text-white">{currentFile || '…'}</span>
            </>
          )}
        </span>

        <div className="flex items-center gap-4">
          <span style={{ color: '#7A9CC0' }}>
            {progress.current} / {progress.total} files
          </span>
          {compliancePct === null ? (
            <span style={{ color: '#7A9CC0' }}>compliance —</span>
          ) : (
            <span className="font-semibold" style={{ color: '#00BFFF' }}>
              {compliancePct}% compliant{reviewStatus === 'running' ? ' so far' : ''}
            </span>
          )}

          {/* Stop/Resume/Cancel controls */}
          {reviewStatus === 'running' && (
            <button
              onClick={onStop}
              title="Stop review"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
              style={{ background: '#FF444422', color: '#FF8080', border: '1px solid #FF444455' }}
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}

          {reviewStatus === 'stopped' && (
            <>
              <button
                onClick={onResume}
                title="Resume review"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#00BFFF22', color: '#00BFFF', border: '1px solid #00BFFF55' }}
              >
                <Play className="w-3 h-3" />
                Resume
              </button>
              <button
                onClick={onViewReport}
                title="View & export the files reviewed so far"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#00A87622', color: '#00C896', border: '1px solid #00A87655' }}
              >
                <FileSpreadsheet className="w-3 h-3" />
                View Results &amp; Export
              </button>
              <button
                onClick={onCancel}
                title="Cancel and reset"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#1E3A5F', color: '#7A9CC0', border: '1px solid #1E3A5F' }}
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </>
          )}

          {reviewStatus === 'complete' && (
            <>
              <button
                onClick={onViewReport}
                title="View the report & export"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#00A87622', color: '#00C896', border: '1px solid #00A87655' }}
              >
                <FileSpreadsheet className="w-3 h-3" />
                View Report
              </button>
              <button
                onClick={onNewReview}
                title="Start a new review"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#00BFFF22', color: '#00BFFF', border: '1px solid #00BFFF55' }}
              >
                <Plus className="w-3 h-3" />
                New Review
              </button>
            </>
          )}

          {/* Always available: bail out to a fresh review */}
          {reviewStatus === 'running' && (
            <button
              onClick={onNewReview}
              title="Stop and start a new review"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
              style={{ color: '#7A9CC0' }}
            >
              <Plus className="w-3 h-3" />
              New Review
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden"
           style={{ background: '#1E3A5F' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: reviewStatus === 'stopped' ? '#FFA500' : '#00BFFF',
          }}
        />
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#FF4444' }} />
          <span style={{ color: '#FF8080' }}>{stats.critical} Critical</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#FFA500' }} />
          <span style={{ color: '#FFC080' }}>{stats.warning} Warning</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#00A896' }} />
          <span style={{ color: '#80E0D0' }}>{stats.passed} Pass</span>
        </span>

        {reviewStatus === 'stopped' && (
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: '#FFA50022', color: '#FFA500', border: '1px solid #FFA50055' }}>
            PAUSED
          </span>
        )}
      </div>
    </div>
  );
}
