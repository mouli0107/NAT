import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageCoverage {
  path: string;
  domain: string;
  testCount: number;
  passCount: number;
  failCount: number;
  neverCount: number;
  lastRunAt: number | null;
  testNames: string[];
}

interface DomainCoverage {
  domain: string;
  testCount: number;
  passRate: number;
  pageCount: number;
}

interface CoverageReport {
  totalTests: number;
  totalDiscoveredPages: number;
  coveredPages: number;
  coveragePct: number;
  passRate: number;
  executedRate: number;
  byPage: PageCoverage[];
  byDomain: DomainCoverage[];
  uncoveredPages: string[];
  generatedAt: number;
}

// ─── Coverage Gauge ───────────────────────────────────────────────────────────

function CoverageGauge({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const trackColor = color === 'emerald' ? '#064e3b' : color === 'blue' ? '#1e3a5f' : '#3b1f5e';
  const fillColor  = color === 'emerald' ? '#10b981' : color === 'blue'  ? '#3b82f6' : '#8b5cf6';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke={trackColor} strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={fillColor} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="44" y="48" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{pct}%</text>
      </svg>
      <span className="text-[10px] text-slate-500 text-center">{label}</span>
    </div>
  );
}

// ─── Domain icon helper ───────────────────────────────────────────────────────

function domainIcon(domain: string): string {
  const map: Record<string, string> = {
    auth: '🔐', checkout: '🛒', registration: '📝', search: '🔍',
    dashboard: '📊', catalog: '📦', profile: '👤', support: '🎧',
    reporting: '📈', admin: '⚙️', general: '🌐',
  };
  return map[domain] ?? '🌐';
}

function passRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-400';
  if (rate >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function statusBadge(pass: number, fail: number, never: number) {
  if (fail > 0)   return <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-900/40 text-red-400 border border-red-500/30">FAILING</span>;
  if (never > 0 && pass === 0) return <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-slate-800 text-slate-500 border border-slate-700">NEVER RUN</span>;
  if (pass > 0)   return <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-500/30">PASSING</span>;
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoveragePage() {
  const [report, setReport]           = useState<CoverageReport | null>(null);
  const [loading, setLoading]         = useState(true);
  const [insightsText, setInsightsText] = useState('');
  const [insightsDone, setInsightsDone] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<'pages' | 'domains' | 'uncovered'>('pages');
  const [domainFilter, setDomainFilter] = useState('all');
  const insightsRef = useRef<HTMLDivElement>(null);

  // Load report
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coverage/report');
      setReport(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  // Auto-scroll insights
  useEffect(() => {
    if (insightsRef.current) insightsRef.current.scrollTop = insightsRef.current.scrollHeight;
  }, [insightsText]);

  // Stream Claude insights
  const fetchInsights = useCallback(async () => {
    setInsightsText('');
    setInsightsDone(false);
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/coverage/insights');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'chunk')  setInsightsText(prev => prev + evt.text);
            if (evt.type === 'done')   setInsightsDone(true);
          } catch {}
        }
      }
    } catch (e: any) {
      setInsightsText(`Error: ${e.message}`);
    }
    setInsightsLoading(false);
  }, []);

  // Derived
  const filteredPages = report?.byPage.filter(p =>
    domainFilter === 'all' || p.domain === domainFilter
  ) ?? [];

  const domains = [...new Set(report?.byPage.map(p => p.domain) ?? [])].sort();

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#050a14] text-white items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading coverage report…</span>
      </div>
    );
  }

  const empty = !report || report.totalTests === 0;

  return (
    <div className="flex flex-col h-full bg-[#050a14] text-white overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm">
        <Link href="/dashboard">
          <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors">
            <span>←</span> Dashboard
          </button>
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-xs font-semibold text-white">Coverage Reporter</span>
        <div className="flex-1" />
        <button onClick={loadReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700">
          ↻ Refresh
        </button>
        <Link href="/test-library">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700">
            🗂 Test Library
          </button>
        </Link>
        <Link href="/recorder">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600/80 to-red-600/80 hover:from-rose-600 hover:to-red-600 text-white text-xs font-semibold transition-all">
            <span className="text-[10px]">⏺</span> Record Test
          </button>
        </Link>
      </div>

      {empty ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-700">
          <div className="text-6xl">📊</div>
          <div className="text-sm font-semibold text-slate-500">No tests recorded yet</div>
          <div className="text-xs text-slate-700 max-w-xs text-center">
            Record user flows in the Test Library to start tracking coverage.
          </div>
          <Link href="/recorder">
            <button className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold transition-all hover:opacity-90">
              ⏺ Record First Test
            </button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ── Coverage gauges ─────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950/30">

            {/* Gauges */}
            <div className="flex items-center gap-8">
              <CoverageGauge pct={report!.coveragePct}  label="Page Coverage"   color="emerald" />
              <CoverageGauge pct={report!.passRate}      label="Pass Rate"       color="blue" />
              <CoverageGauge pct={report!.executedRate}  label="Tests Executed"  color="violet" />
            </div>

            {/* Counters */}
            <div className="flex items-center gap-6">
              {[
                { val: report!.totalTests,           label: 'Total Tests',    color: 'text-white' },
                { val: report!.coveredPages,          label: 'Pages Covered',  color: 'text-emerald-400' },
                { val: report!.totalDiscoveredPages,  label: 'Pages Found',    color: 'text-slate-400' },
                { val: report!.uncoveredPages.length, label: 'Untested Pages', color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-slate-600">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Coverage % callout */}
            <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/30">
              <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Overall Coverage</div>
              <div className={`text-5xl font-black ${
                report!.coveragePct >= 80 ? 'text-emerald-400' :
                report!.coveragePct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {report!.coveragePct}%
              </div>
              <div className="text-[9px] text-slate-600">
                {report!.coveredPages} / {report!.totalDiscoveredPages} pages
              </div>
              {/* Progress bar */}
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div className={`h-full rounded-full transition-all ${
                  report!.coveragePct >= 80 ? 'bg-emerald-400' :
                  report!.coveragePct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${report!.coveragePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex gap-0">

            {/* Left: coverage detail ───────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800/60">

              {/* Tabs + filter */}
              <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2.5 border-b border-slate-800/60 bg-slate-950/40">
                {(['pages', 'domains', 'uncovered'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>
                    {tab === 'pages'     ? `📄 Pages (${report!.byPage.length})` :
                     tab === 'domains'   ? `🏷 Domains (${report!.byDomain.length})` :
                     `⚠️ Untested (${report!.uncoveredPages.length})`}
                  </button>
                ))}

                {activeTab === 'pages' && domains.length > 1 && (
                  <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
                    className="ml-auto bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none">
                    <option value="all">All domains</option>
                    {domains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

                {/* ── Pages tab ────────────────────────────────────────────── */}
                {activeTab === 'pages' && (
                  filteredPages.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-slate-700 text-xs">No pages match filter</div>
                  ) : filteredPages.map((page, i) => {
                    const total = page.passCount + page.failCount + page.neverCount;
                    const passPct = total > 0 ? Math.round((page.passCount / total) * 100) : 0;
                    return (
                      <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 hover:border-slate-700 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0 mt-0.5">{domainIcon(page.domain)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[11px] text-indigo-300 font-semibold truncate">{page.path}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 flex-shrink-0">{page.domain}</span>
                              {statusBadge(page.passCount, page.failCount, page.neverCount)}
                            </div>
                            {/* Mini progress bar */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${passPct}%` }} />
                              </div>
                              <span className={`text-[9px] font-bold flex-shrink-0 ${passRateColor(passPct)}`}>{passPct}%</span>
                            </div>
                            {/* Test names */}
                            <div className="flex flex-wrap gap-1">
                              {page.testNames.slice(0, 4).map((name, j) => (
                                <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40 truncate max-w-[180px]">{name}</span>
                              ))}
                              {page.testNames.length > 4 && (
                                <span className="text-[9px] text-slate-600">+{page.testNames.length - 4} more</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm font-bold text-white">{page.testCount}</div>
                            <div className="text-[9px] text-slate-600">tests</div>
                            <div className="flex gap-1 mt-1 justify-end">
                              {page.passCount > 0  && <span className="text-[9px] text-emerald-400">✓{page.passCount}</span>}
                              {page.failCount > 0  && <span className="text-[9px] text-red-400">✗{page.failCount}</span>}
                              {page.neverCount > 0 && <span className="text-[9px] text-slate-600">○{page.neverCount}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* ── Domains tab ───────────────────────────────────────────── */}
                {activeTab === 'domains' && (
                  report!.byDomain.map((dom, i) => (
                    <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{domainIcon(dom.domain)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-bold text-white capitalize">{dom.domain}</span>
                            <span className="text-[9px] text-slate-600">{dom.pageCount} page{dom.pageCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${dom.passRate >= 80 ? 'bg-emerald-500' : dom.passRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${dom.passRate}%` }} />
                            </div>
                            <span className={`text-[10px] font-bold flex-shrink-0 ${passRateColor(dom.passRate)}`}>{dom.passRate}% pass</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-black text-white">{dom.testCount}</div>
                          <div className="text-[9px] text-slate-600">tests</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* ── Uncovered tab ─────────────────────────────────────────── */}
                {activeTab === 'uncovered' && (
                  report!.uncoveredPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-600">
                      <span className="text-3xl">🎉</span>
                      <span className="text-xs">No uncovered pages detected in navigation</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="px-3 py-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[10px] text-amber-300/70">
                        ⚠️ These pages were visited during recorded tests but have no dedicated test starting from them.
                      </div>
                      {report!.uncoveredPages.map((page, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-500/10 bg-amber-950/10 hover:border-amber-500/20 transition-colors">
                          <span className="text-amber-500 text-xs">○</span>
                          <span className="font-mono text-[11px] text-amber-300/80">{page}</span>
                          <Link href="/recorder" className="ml-auto">
                            <button className="text-[9px] px-2 py-1 rounded-lg bg-rose-900/30 text-rose-400 border border-rose-500/20 hover:bg-rose-900/50 transition-colors flex-shrink-0">
                              ⏺ Record
                            </button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Right: Claude Insights ──────────────────────────────────────── */}
            <div className="w-[420px] flex-shrink-0 flex flex-col bg-[#030712]">
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-slate-800/60">
                <span className="text-blue-400">🤖</span>
                <span className="text-xs font-bold text-slate-300">Claude Coverage Insights</span>
                {insightsLoading && (
                  <div className="ml-1 flex gap-1">
                    {[0,100,200].map(d => (
                      <div key={d} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                )}
                {insightsDone && <span className="text-[9px] text-blue-600 ml-1">✓ done</span>}
                <button onClick={fetchInsights} disabled={insightsLoading}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[10px] font-semibold border border-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {insightsLoading ? 'Analysing…' : insightsText ? '↻ Re-analyse' : '✦ Analyse Gaps'}
                </button>
              </div>

              <div ref={insightsRef} className="flex-1 overflow-auto p-4"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

                {!insightsText && !insightsLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-700">
                    <div className="text-4xl">🤖</div>
                    <div className="text-xs text-center text-slate-600 max-w-[260px]">
                      Click <strong className="text-slate-500">Analyse Gaps</strong> to let Claude review your coverage and recommend which flows to test next.
                    </div>
                  </div>
                )}

                {insightsLoading && !insightsText && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Analysing your test suite…</span>
                  </div>
                )}

                {insightsText && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/15 bg-blue-900/20">
                      <span className="text-[10px]">🔍</span>
                      <span className="text-[10px] font-bold text-blue-300 tracking-wide">COVERAGE GAP ANALYSIS</span>
                    </div>
                    <div className="px-4 py-3 text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {insightsText.split(/^(#{1,3} .+)$/m).map((part, i) => {
                        if (/^#{1,3} /.test(part)) {
                          return <div key={i} className="font-bold text-blue-300 mt-3 mb-1 text-[11px]">{part.replace(/^#{1,3} /, '')}</div>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Last updated */}
              {report && (
                <div className="flex-shrink-0 px-4 py-2 border-t border-slate-800/60 text-[9px] text-slate-700">
                  Report generated {new Date(report.generatedAt).toLocaleTimeString()}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
