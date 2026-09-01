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

  const decided = stats.critical + stats.warning + stats.passed;
  const compliancePct: number | null = decided > 0
    ? Math.round((stats.passed / decided) * 100)
    : null;

  return (
    <div className="px-4 py-3 border-b space-y-2"
         style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>

      {/* Top row: file name, count, compliance, controls */}
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: '#374151' }}>
          {reviewStatus === 'complete' ? (
            <span className="font-semibold flex items-center gap-1" style={{ color: '#059669' }}>
              <CheckCircle className="w-3.5 h-3.5" /> Review complete — fix violations below, or view the report
            </span>
          ) : reviewStatus === 'stopped' ? (
            <span className="font-semibold" style={{ color: '#d97706' }}>⏸ Review paused</span>
          ) : statusMessage ? (
            <span className="font-mono" style={{ color: '#2563eb' }}>
              <span className="inline-block animate-spin mr-1">⟳</span>
              {statusMessage}
            </span>
          ) : (
            <>
              Reviewing{' '}
              <span className="font-mono font-medium" style={{ color: '#111827' }}>{currentFile || '…'}</span>
            </>
          )}
        </span>

        <div className="flex items-center gap-4">
          <span style={{ color: '#6b7280' }}>
            {progress.current} / {progress.total} files
          </span>
          {compliancePct === null ? (
            <span style={{ color: '#6b7280' }}>quality —</span>
          ) : (
            <span className="font-semibold" style={{ color: '#2563eb' }}>
              {compliancePct}% quality{reviewStatus === 'running' ? ' so far' : ''}
            </span>
          )}

          {reviewStatus === 'running' && (
            <button onClick={onStop} title="Stop review"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <Square className="w-3 h-3" /> Stop
            </button>
          )}

          {reviewStatus === 'stopped' && (
            <>
              <button onClick={onResume} title="Resume review"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                <Play className="w-3 h-3" /> Resume
              </button>
              <button onClick={onViewReport} title="View & export the files reviewed so far"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#d1fae5', color: '#059669', border: '1px solid #a7f3d0' }}>
                <FileSpreadsheet className="w-3 h-3" /> View Results &amp; Export
              </button>
              <button onClick={onCancel} title="Cancel and reset"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                <X className="w-3 h-3" /> Cancel
              </button>
            </>
          )}

          {reviewStatus === 'complete' && (
            <>
              <button onClick={onViewReport} title="View the report & export"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#d1fae5', color: '#059669', border: '1px solid #a7f3d0' }}>
                <FileSpreadsheet className="w-3 h-3" /> View Report
              </button>
              <button onClick={onNewReview} title="Start a new review"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
                style={{ background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                <Plus className="w-3 h-3" /> New Review
              </button>
            </>
          )}

          {reviewStatus === 'running' && (
            <button onClick={onNewReview} title="Stop and start a new review"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
              style={{ color: '#6b7280' }}>
              <Plus className="w-3 h-3" /> New Review
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: reviewStatus === 'stopped' ? '#d97706' : '#2563eb' }} />
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#dc2626' }} />
          <span style={{ color: '#dc2626' }}>{stats.critical} Critical</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#d97706' }} />
          <span style={{ color: '#d97706' }}>{stats.warning} Warning</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#059669' }} />
          <span style={{ color: '#059669' }}>{stats.passed} Pass</span>
        </span>

        {reviewStatus === 'stopped' && (
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
            PAUSED
          </span>
        )}
      </div>
    </div>
  );
}
