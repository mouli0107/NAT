import { useState } from 'react';
import type { RunSummary, RunDetail } from '@/lib/codeLensHistoryApi';
import { fetchRunHistory, fetchRunDetail, fetchRunViolations } from '@/lib/codeLensHistoryApi';
import type { ViolationRow } from '@/lib/codeLensHistoryApi';

interface Props {
  onSelectForCompare?: (run: RunSummary) => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function fmtDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'COMPLETE' ? 'bg-green-100 text-green-700' :
    status === 'ERROR'    ? 'bg-red-100 text-red-700' :
    status === 'RUNNING'  ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-gray-400 text-xs">—</span>;
  const color = pct >= 0 ? 'text-green-600' : 'text-red-500';
  return <span className={`text-xs font-semibold ${color}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>;
}

export function RunHistory({ onSelectForCompare }: Props) {
  const [repoUrl, setRepoUrl]       = useState('');
  const [branch,  setBranch]        = useState('main');
  const [runs,    setRuns]          = useState<RunSummary[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState<string | null>(null);
  const [detail,  setDetail]        = useState<RunDetail | null>(null);
  const [detailViolations, setDetailViolations] = useState<ViolationRow[]>([]);
  const [detailLoading, setDetailLoading]       = useState(false);
  const [compareA, setCompareA] = useState<RunSummary | null>(null);

  const load = async () => {
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRunHistory(repoUrl.trim(), branch.trim() || 'main');
      setRuns(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (run: RunSummary) => {
    setDetailLoading(true);
    try {
      const [d, v] = await Promise.all([
        fetchRunDetail(run.runId),
        fetchRunViolations(run.runId),
      ]);
      setDetail(d);
      setDetailViolations(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detail load failed');
    } finally {
      setDetailLoading(false);
    }
  };

  if (detail) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => setDetail(null)}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to run list
        </button>

        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex items-center gap-3">
            <StatusBadge status={detail.status} />
            <span className="font-semibold text-gray-800">{detail.commitHash?.slice(0, 8) ?? 'unknown'}</span>
            <span className="text-gray-500">{fmtDate(detail.startedAt)}</span>
            <span className="text-gray-400">({fmtDuration(detail.startedAt, detail.completedAt)})</span>
          </div>
          <div className="text-gray-600">
            {detail.repoUrl} · {detail.branch}
          </div>
          <div className="flex gap-4 pt-1">
            <span className="text-red-600 font-semibold">{detail.criticalCount} Critical</span>
            <span className="text-yellow-600 font-semibold">{detail.warningCount} Warning</span>
            <span className="text-blue-600 font-semibold">{detail.infoCount} Info</span>
            <span className="text-green-600 font-semibold">{detail.compliancePct.toFixed(1)}% Compliant</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Files ({detail.fileResults.length})
          </h3>
          <div className="overflow-auto max-h-48 border rounded">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left p-2">File</th>
                  <th className="p-2">Crit</th>
                  <th className="p-2">Warn</th>
                  <th className="p-2">Pass%</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.fileResults.map(f => (
                  <tr key={f.fileResultId} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono text-gray-700 max-w-xs truncate">{f.filePath}</td>
                    <td className="p-2 text-center text-red-600">{f.criticalCount || '—'}</td>
                    <td className="p-2 text-center text-yellow-600">{f.warningCount || '—'}</td>
                    <td className="p-2 text-center">{f.compliancePct.toFixed(0)}%</td>
                    <td className="p-2 text-center">
                      <span className={f.status === 'PASS' ? 'text-green-600' : 'text-red-500'}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {detailViolations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Violations ({detailViolations.length})
            </h3>
            <div className="overflow-auto max-h-64 space-y-2">
              {detailViolations.map(v => (
                <div key={v.violationId} className="border rounded p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={
                      v.severity === 'Critical' ? 'text-red-600 font-bold' :
                      v.severity === 'Warning'  ? 'text-yellow-600 font-semibold' :
                                                  'text-blue-600'
                    }>{v.severity}</span>
                    <span className="text-gray-500">{v.standardId}</span>
                    <span className="font-medium">{v.standardName}</span>
                    {v.lineStart && <span className="text-gray-400">L{v.lineStart}</span>}
                  </div>
                  <div className="text-gray-600 font-mono truncate">{v.filePath}</div>
                  {v.foundCode && (
                    <pre className="bg-red-50 text-red-800 p-1 rounded text-xs overflow-auto max-h-16">{v.foundCode}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Repository URL</label>
          <input
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="https://dev.azure.com/org/project/_git/repo"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="w-32">
          <label className="text-xs text-gray-500 block mb-1">Branch</label>
          <input
            value={branch}
            onChange={e => setBranch(e.target.value)}
            placeholder="main"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={load}
          disabled={loading || !repoUrl.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load History'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}

      {compareA && (
        <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3 flex items-center justify-between">
          <span>Baseline selected: <strong>{fmtDate(compareA.startedAt)}</strong> ({compareA.commitHash?.slice(0, 8)})</span>
          <button onClick={() => setCompareA(null)} className="text-xs text-blue-600 hover:underline">Clear</button>
        </div>
      )}

      {runs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500">{runs.length} run(s) found</div>
          {runs.map((run, idx) => (
            <div key={run.runId} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={run.status} />
                  <span className="text-sm font-mono text-gray-700">{run.commitHash?.slice(0, 8) ?? '—'}</span>
                  <span className="text-sm text-gray-600">{fmtDate(run.startedAt)}</span>
                  <span className="text-xs text-gray-400">({fmtDuration(run.startedAt, run.completedAt)})</span>
                  {idx > 0 && <TrendBadge pct={run.compliancePct - runs[idx - 1].compliancePct} />}
                </div>
                <div className="flex gap-2">
                  {onSelectForCompare && (
                    <button
                      onClick={() => {
                        if (compareA) {
                          onSelectForCompare({ ...run, _baselineRunId: compareA.runId } as any);
                          setCompareA(null);
                        } else {
                          setCompareA(run);
                        }
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {compareA ? 'Compare with this' : 'Set as baseline'}
                    </button>
                  )}
                  <button
                    onClick={() => openDetail(run)}
                    className="text-xs text-gray-600 hover:underline"
                    disabled={detailLoading}
                  >
                    View details
                  </button>
                </div>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                <span>{run.scannedFiles} files scanned</span>
                <span className="text-red-500">{run.criticalCount} critical</span>
                <span className="text-yellow-500">{run.warningCount} warning</span>
                <span className="text-green-600">{run.compliancePct.toFixed(1)}% compliant</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {runs.length === 0 && !loading && repoUrl && (
        <div className="text-sm text-gray-500 text-center py-8">
          No runs found for this repository and branch.
        </div>
      )}
    </div>
  );
}
