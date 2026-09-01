import { useState, useEffect } from 'react';
import { Loader2, Search, RotateCcw, GitBranch, Clock, FileText } from 'lucide-react';
import type { RunSummary, RunDetail, ViolationRow } from '@/lib/codeLensHistoryApi';
import { fetchRecentRuns, fetchRunHistory, fetchRunDetail, fetchRunViolations } from '@/lib/codeLensHistoryApi';

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

function repoName(url: string): string {
  try { return url.replace(/\.git$/, '').split('/').filter(Boolean).pop() ?? url; }
  catch { return url; }
}

function complianceColor(pct: number): string {
  if (pct >= 90) return '#059669';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  COMPLETE: { bg: 'rgba(55,230,164,0.14)', text: '#059669' },
  PARTIAL:  { bg: 'rgba(255,180,84,0.14)', text: '#d97706' },
  STOPPED:  { bg: 'rgba(255,180,84,0.14)', text: '#d97706' },
  RUNNING:  { bg: 'rgba(78,225,255,0.14)', text: '#2563eb' },
  ERROR:    { bg: 'rgba(255,92,122,0.14)', text: '#dc2626' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span className="cl-mono" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

export function RunHistory({ onSelectForCompare }: Props) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch]   = useState('');
  const [runs, setRuns]       = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [scope, setScope]     = useState<'recent' | 'filtered'>('recent');

  const [selectedId, setSelectedId]             = useState<string | null>(null);
  const [detail, setDetail]                     = useState<RunDetail | null>(null);
  const [detailViolations, setDetailViolations] = useState<ViolationRow[]>([]);
  const [detailLoading, setDetailLoading]       = useState(false);
  const [compareA, setCompareA]                 = useState<RunSummary | null>(null);

  // Auto-load the most recent runs on mount — no manual entry required.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchRecentRuns(40)
      .then(r => { if (alive) { setRuns(r); setScope('recent'); } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load history'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const loadFiltered = async () => {
    if (!repoUrl.trim()) return;
    setLoading(true); setError(null);
    try {
      setRuns(await fetchRunHistory(repoUrl.trim(), branch.trim() || 'main', 40));
      setScope('filtered');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally { setLoading(false); }
  };

  const loadRecent = async () => {
    setRepoUrl(''); setBranch(''); setLoading(true); setError(null);
    try { setRuns(await fetchRecentRuns(40)); setScope('recent'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load history'); }
    finally { setLoading(false); }
  };

  const openDetail = async (run: RunSummary) => {
    setSelectedId(run.runId);
    setDetail(null);
    setDetailViolations([]);
    setDetailLoading(true);
    setError(null);
    try {
      const [d, v] = await Promise.all([fetchRunDetail(run.runId), fetchRunViolations(run.runId)]);
      setDetail(d);
      setDetailViolations(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detail load failed');
    } finally {
      setDetailLoading(false);
    }
  };

  const inputStyle = { background: '#ffffff', border: '1px solid var(--cl-line)', color: 'var(--cl-t0)' };

  return (
    <div className="cl-root flex min-h-0" style={{ flex: 1 }}>
      {/* ── LEFT: run list ─────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-0" style={{ width: 400, borderRight: '1px solid var(--cl-line)', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--cl-line)' }}>
          <div className="cl-grot" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Run History</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadFiltered()}
              placeholder="Filter by repo URL (optional)"
              className="flex-1" style={{ ...inputStyle, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', minWidth: 0 }} />
            <button onClick={loadFiltered} disabled={loading || !repoUrl.trim()} className="cl-pill"
              style={{ display: 'flex', alignItems: 'center', padding: '0 12px', opacity: !repoUrl.trim() ? 0.5 : 1 }}>
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="branch (main)"
              className="flex-1" style={{ ...inputStyle, borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', minWidth: 0 }} />
            {scope === 'filtered' && (
              <button onClick={loadRecent} className="cl-navbtn" style={{ border: '1px solid var(--cl-line)', fontSize: 11 }}>
                <RotateCcw className="w-3.5 h-3.5" /> Recent
              </button>
            )}
          </div>
          <div className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-t2)', marginTop: 8, letterSpacing: 0.5 }}>
            {scope === 'recent' ? 'Most recent across all repos' : `${repoName(repoUrl)} · ${branch || 'main'}`}
            {!loading && ` · ${runs.length}`}
          </div>
        </div>

        {compareA && (
          <div style={{ fontSize: 11, background: 'rgba(37,99,235,0.08)', borderBottom: '1px solid rgba(78,225,255,0.3)', padding: '8px 16px', color: 'var(--cl-t1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Baseline: {compareA.commitHash?.slice(0, 8)}</span>
            <button onClick={() => setCompareA(null)} className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-cyan)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Clear</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cl-t2)', fontSize: 13, padding: 24, justifyContent: 'center' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : error && runs.length === 0 ? (
            <div style={{ color: '#dc2626', fontSize: 12, padding: 16 }}>{error}</div>
          ) : runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--cl-t2)', fontSize: 13 }}>
              No reviews yet. Run one and it appears here.
            </div>
          ) : (
            runs.map(run => {
              const active = run.runId === selectedId;
              return (
                <button key={run.runId} onClick={() => openDetail(run)}
                  className="w-full text-left" style={{
                    display: 'block', padding: '12px 16px', borderBottom: '1px solid var(--cl-line)',
                    background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
                    borderLeft: active ? '2px solid var(--cl-cyan)' : '2px solid transparent', cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span className="cl-grot" style={{ fontWeight: 700, fontSize: 13, color: 'var(--cl-t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repoName(run.repoUrl)}</span>
                    <span className="cl-grot" style={{ fontWeight: 700, fontSize: 15, color: complianceColor(run.compliancePct), flexShrink: 0 }}>{Math.round(run.compliancePct)}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                    <StatusBadge status={run.status} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--cl-t2)', fontSize: 10 }}><GitBranch className="w-3 h-3" />{run.branch}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 10, color: 'var(--cl-t2)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock className="w-3 h-3" />{fmtDate(run.startedAt)}</span>
                    <span style={{ color: '#dc2626' }}>{run.criticalCount}C</span>
                    <span style={{ color: '#d97706' }}>{run.warningCount}W</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: selected run detail ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-w-0" style={{ minHeight: 0 }}>
        {!selectedId ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--cl-t2)', gap: 12 }}>
            <FileText className="w-10 h-10" style={{ opacity: 0.4 }} />
            <div className="cl-grot" style={{ fontSize: 16, color: 'var(--cl-t1)' }}>Select a run to view details</div>
            <div style={{ fontSize: 13 }}>Files reviewed, quality score, and every violation.</div>
          </div>
        ) : detailLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cl-t2)', gap: 8 }}>
            <Loader2 className="w-5 h-5 animate-spin" /> Loading run details…
          </div>
        ) : detail ? (
          <div style={{ padding: 24 }}>
            {/* Header */}
            <div className="cl-glass" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <StatusBadge status={detail.status} />
                  <span className="cl-grot" style={{ fontWeight: 700, fontSize: 16 }}>{repoName(detail.repoUrl)}</span>
                  <span className="cl-mono" style={{ color: 'var(--cl-t2)', fontSize: 12 }}>{detail.commitHash?.slice(0, 8) ?? 'unknown'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cl-t2)', fontSize: 12 }}><GitBranch className="w-3 h-3" />{detail.branch}</span>
                </div>
                <div className="cl-mono" style={{ color: 'var(--cl-t2)', fontSize: 11, marginTop: 6 }}>
                  {fmtDate(detail.startedAt)} · {fmtDuration(detail.startedAt, detail.completedAt)}
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: '#dc2626' }}>{detail.criticalCount} Critical</span>
                  <span style={{ color: '#d97706' }}>{detail.warningCount} Warning</span>
                  <span style={{ color: '#2563eb' }}>{detail.infoCount} Info</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="cl-grot" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: complianceColor(detail.compliancePct) }}>
                  {Math.round(detail.compliancePct)}<span style={{ fontSize: 20, color: 'var(--cl-t2)' }}>%</span>
                </div>
                <div className="cl-mono" style={{ fontSize: 10, color: 'var(--cl-t2)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>Quality Score</div>
                {onSelectForCompare && (
                  <button
                    onClick={() => {
                      const run = runs.find(r => r.runId === detail.runId);
                      if (!run) return;
                      if (compareA) { onSelectForCompare({ ...run, _baselineRunId: compareA.runId } as RunSummary & { _baselineRunId: string }); setCompareA(null); }
                      else setCompareA(run);
                    }}
                    className="cl-mono" style={{ marginTop: 10, fontSize: 10, color: 'var(--cl-cyan)', background: 'transparent', border: '1px solid var(--cl-line)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                    {compareA ? 'Compare with this' : 'Set as baseline'}
                  </button>
                )}
              </div>
            </div>

            {/* Files */}
            <div className="cl-grot" style={{ fontSize: 14, fontWeight: 700, color: 'var(--cl-t1)', marginBottom: 10 }}>
              Files ({detail.fileResults.length})
            </div>
            <div style={{ border: '1px solid var(--cl-line)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <table className="w-full" style={{ fontSize: 12, borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f3f4f6' }}>
                  <tr style={{ color: 'var(--cl-t2)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>File</th>
                    <th style={{ padding: '10px 14px' }}>Crit</th>
                    <th style={{ padding: '10px 14px' }}>Warn</th>
                    <th style={{ padding: '10px 14px' }}>Quality</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.fileResults.map(f => (
                    <tr key={f.fileResultId} style={{ borderTop: '1px solid var(--cl-line)' }}>
                      <td className="cl-mono" style={{ padding: '9px 14px', color: 'var(--cl-t1)', maxWidth: 640, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filePath}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', color: '#dc2626' }}>{f.criticalCount || '—'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', color: '#d97706' }}>{f.warningCount || '—'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', color: 'var(--cl-t1)' }}>{f.compliancePct.toFixed(0)}%</td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', color: f.status === 'PASS' ? '#059669' : '#dc2626' }}>{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Violations */}
            {detailViolations.length > 0 && (
              <>
                <div className="cl-grot" style={{ fontSize: 14, fontWeight: 700, color: 'var(--cl-t1)', marginBottom: 10 }}>
                  Violations ({detailViolations.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 12 }}>
                  {detailViolations.map(v => (
                    <div key={v.violationId} style={{ border: '1px solid var(--cl-line)', borderRadius: 10, padding: 12, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: v.severity === 'Critical' ? '#dc2626' : v.severity === 'Warning' ? '#d97706' : '#2563eb' }}>{v.severity}</span>
                        <span className="cl-mono" style={{ color: 'var(--cl-t2)' }}>{v.standardId}</span>
                        <span style={{ color: 'var(--cl-t0)', fontWeight: 600 }}>{v.standardName}</span>
                        {v.lineStart && <span style={{ color: 'var(--cl-t2)' }}>L{v.lineStart}</span>}
                      </div>
                      <div className="cl-mono" style={{ color: 'var(--cl-t1)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.filePath}</div>
                      {v.foundCode && (
                        <pre className="cl-mono" style={{ background: '#fef2f2', color: '#ffb0be', padding: 8, borderRadius: 6, marginTop: 6, overflow: 'auto', maxHeight: 90 }}>{v.foundCode}</pre>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>{error ?? 'Could not load this run.'}</div>
        )}
      </div>
    </div>
  );
}
