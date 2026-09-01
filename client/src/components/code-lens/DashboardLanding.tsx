import { useEffect, useState } from 'react';
import { History, Loader2, GitBranch, BookOpen, X } from 'lucide-react';
import { SetupPanel } from './SetupPanel';
import { StandardsCatalog } from './StandardsCatalog';
import { fetchRecentRuns, type RunSummary } from '@/lib/codeLensHistoryApi';

interface DashboardLandingProps {
  onStart: (repoUrl: string, branch: string, pat: string, folders: string[], ignorePatterns: string[]) => void;
  onResumeFixing: (repoUrl: string, branch: string, pat: string) => void;
  onStartPr: (prUrl: string, pat: string, ignorePatterns: string[]) => void;
  isLoading: boolean;
  error: string | null;
  onOpenHistory: () => void;
}

function repoName(url: string): string {
  try { return url.replace(/\.git$/, '').split('/').filter(Boolean).pop() ?? url; }
  catch { return url; }
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  COMPLETE: { bg: '#05966922', text: '#059669' },
  STOPPED:  { bg: '#d9770622', text: '#d97706' },
  RUNNING:  { bg: '#2563eb22', text: '#2563eb' },
  ERROR:    { bg: '#dc262622', text: '#dc2626' },
};

function complianceColor(pct: number): string {
  if (pct >= 90) return '#059669';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

export function DashboardLanding({ onStart, onResumeFixing, onStartPr, isLoading, error, onOpenHistory }: DashboardLandingProps) {
  const [runs, setRuns]       = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    fetchRecentRuns(10)
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="cl-root max-w-3xl mx-auto px-6 py-10">
      {/* Centered hero — flyer aesthetic */}
      <div className="flex flex-col items-center text-center mb-7">
        <div className="cl-eyebrow" style={{ marginBottom: 18 }}>
          <span className="dot" /> Agentic Code Standards Engine
        </div>
        <h1 className="cl-grot" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1, margin: 0 }}>
          See every build's<br /><span className="cl-grad">quality score</span>
        </h1>
        <p style={{ color: 'var(--cl-t1)', fontSize: 15, marginTop: 14, maxWidth: 470, lineHeight: 1.65 }}>
          Connect a repository, validate it against your standards on every build,
          and auto-review every pull request.
        </p>
        <button
          onClick={() => setShowCatalog(true)}
          className="cl-mono"
          style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--cl-cyan)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <BookOpen className="w-3.5 h-3.5" /> View the 42 standards ASTRA checks
        </button>
      </div>

      {/* Centered connect card */}
      <div className="max-w-lg mx-auto">
        <SetupPanel
          onStart={onStart}
          onResumeFixing={onResumeFixing}
          onStartPr={onStartPr}
          isLoading={isLoading}
          error={error}
          embedded
        />
      </div>

      {/* Recent reviews strip */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: '#2563eb' }} /> Recent reviews
          </h2>
          {runs.length > 0 && (
            <button onClick={onOpenHistory} className="text-xs font-semibold" style={{ color: '#2563eb' }}>
              All history & compare →
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center py-6 text-xs" style={{ color: '#9ca3af' }}>
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border px-4 py-6 text-center"
               style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
            <div className="text-sm font-semibold" style={{ color: '#374151' }}>No reviews yet</div>
            <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
              Connect a repository above to run your first review.
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {runs.map(run => {
              const st = STATUS_STYLE[run.status] ?? { bg: '#e5e7eb', text: '#6b7280' };
              return (
                <div key={run.runId}
                     className="flex-shrink-0 w-60 rounded-xl border p-3"
                     style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{repoName(run.repoUrl)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ background: st.bg, color: st.text }}>{run.status}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: '#6b7280' }}>
                    <GitBranch className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{run.branch}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                      <div className="h-full rounded-full"
                           style={{ width: `${run.compliancePct}%`, background: complianceColor(run.compliancePct) }} />
                    </div>
                    <span className="text-[11px] font-bold flex-shrink-0"
                          style={{ color: complianceColor(run.compliancePct) }}>
                      {Math.round(run.compliancePct)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: '#9ca3af' }}>
                    <span style={{ color: '#dc2626' }}>{run.criticalCount}C</span>
                    <span style={{ color: '#d97706' }}>{run.warningCount}W</span>
                    <span>{run.scannedFiles}/{run.totalFiles}f</span>
                    <span className="ml-auto">{relativeTime(run.startedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Standards catalog modal */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
             style={{ background: 'rgba(10,22,40,0.85)' }}
             onClick={() => setShowCatalog(false)}>
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">Coding standards</span>
              <button onClick={() => setShowCatalog(false)} style={{ color: '#6b7280' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <StandardsCatalog />
          </div>
        </div>
      )}
    </div>
  );
}
