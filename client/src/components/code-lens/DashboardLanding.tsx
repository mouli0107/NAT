import { useEffect, useState } from 'react';
import { Shield, History, Loader2, GitBranch, BookOpen, X } from 'lucide-react';
import { SetupPanel } from './SetupPanel';
import { StandardsCatalog } from './StandardsCatalog';
import { fetchRecentRuns, type RunSummary } from '@/lib/codeLensHistoryApi';

interface DashboardLandingProps {
  onStart: (repoUrl: string, branch: string, pat: string, folders: string[], ignorePatterns: string[]) => void;
  onResumeFixing: (repoUrl: string, branch: string, pat: string) => void;
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
  COMPLETE: { bg: '#00A87622', text: '#00C896' },
  STOPPED:  { bg: '#FFA50022', text: '#FFC080' },
  RUNNING:  { bg: '#00BFFF22', text: '#00BFFF' },
  ERROR:    { bg: '#FF444422', text: '#FF8080' },
};

function complianceColor(pct: number): string {
  if (pct >= 90) return '#00C896';
  if (pct >= 70) return '#FFC080';
  return '#FF8080';
}

export function DashboardLanding({ onStart, onResumeFixing, isLoading, error, onOpenHistory }: DashboardLandingProps) {
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
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Centered hero */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
             style={{ background: '#00BFFF18', border: '1px solid #00BFFF35' }}>
          <Shield className="w-6 h-6" style={{ color: '#00BFFF' }} />
        </div>
        <h1 className="text-2xl font-bold text-white">ASTRA Code Lens</h1>
        <p className="text-sm mt-1" style={{ color: '#7A9CC0' }}>
          Agentic standards review for .NET — connect a repository to begin
        </p>
        <button
          onClick={() => setShowCatalog(true)}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: '#00BFFF' }}
        >
          <BookOpen className="w-3.5 h-3.5" /> View the 42 standards ASTRA checks
        </button>
      </div>

      {/* Centered connect card */}
      <div className="max-w-lg mx-auto">
        <SetupPanel
          onStart={onStart}
          onResumeFixing={onResumeFixing}
          isLoading={isLoading}
          error={error}
          embedded
        />
      </div>

      {/* Recent reviews strip */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: '#00BFFF' }} /> Recent reviews
          </h2>
          {runs.length > 0 && (
            <button onClick={onOpenHistory} className="text-xs font-semibold" style={{ color: '#00BFFF' }}>
              All history & compare →
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center py-6 text-xs" style={{ color: '#4A6A8A' }}>
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-xl border px-4 py-6 text-center"
               style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
            <div className="text-sm font-semibold" style={{ color: '#A0C0D8' }}>No reviews yet</div>
            <div className="text-xs mt-1" style={{ color: '#4A6A8A' }}>
              Connect a repository above to run your first review.
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {runs.map(run => {
              const st = STATUS_STYLE[run.status] ?? { bg: '#1E3A5F', text: '#7A9CC0' };
              return (
                <div key={run.runId}
                     className="flex-shrink-0 w-60 rounded-xl border p-3"
                     style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{repoName(run.repoUrl)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ background: st.bg, color: st.text }}>{run.status}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: '#7A9CC0' }}>
                    <GitBranch className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{run.branch}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E3A5F' }}>
                      <div className="h-full rounded-full"
                           style={{ width: `${run.compliancePct}%`, background: complianceColor(run.compliancePct) }} />
                    </div>
                    <span className="text-[11px] font-bold flex-shrink-0"
                          style={{ color: complianceColor(run.compliancePct) }}>
                      {Math.round(run.compliancePct)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: '#4A6A8A' }}>
                    <span style={{ color: '#FF8080' }}>{run.criticalCount}C</span>
                    <span style={{ color: '#FFC080' }}>{run.warningCount}W</span>
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
              <span className="text-sm font-bold text-white">Coding standards</span>
              <button onClick={() => setShowCatalog(false)} style={{ color: '#7A9CC0' }}>
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
