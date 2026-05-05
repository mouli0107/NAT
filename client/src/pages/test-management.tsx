import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  totalRuns: number;
  passRate30: number;
  passedLast30: number;
  failedLast30: number;
  totalTests: number;
  flakyCount: number;
  suiteCount: number;
  requirementCount: number;
  linkedTests: number;
  coverage: number;
  avgDurationSec: number;
  lastRunAt: number | null;
}

interface TrendPoint {
  date: string;
  passed: number;
  failed: number;
  total: number;
  passRate: number | null;
}

interface FlakinessEntry {
  testId: string;
  testName: string;
  stability: number;
  isFlaky: boolean;
  runCount: number;
  lastStatus: string;
  lastRunAt: number;
}

interface HistoryEntry {
  id: string;
  testId: string;
  testName: string;
  suiteId?: string;
  status: string;
  duration: number;
  environment: string;
  errorMessage?: string;
  runAt: number;
}

interface Suite {
  id: string;
  name: string;
  type: string;
  testIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface Requirement {
  id: string;
  title: string;
  description?: string;
  source: string;
  ticketId?: string;
  priority: string;
  createdAt: number;
  linkedTests?: Array<{ testId: string; testName: string; lastStatus?: string }>;
  coverage?: string;
}

interface RTMRow {
  id: string;
  title: string;
  priority: string;
  ticketId?: string;
  tests: Array<{ testId: string; testName: string; lastStatus: string; lastRunAt?: number }>;
  coverage: string;
}

interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  type: string;
  isDefault: boolean;
  createdAt: number;
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#22c55e', height = 32, width = 120 }: {
  data: number[]; color?: string; height?: number; width?: number;
}) {
  if (data.length < 2) return <div style={{ width, height }} className="opacity-20 bg-gray-100 rounded" />;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, color, icon }: {
  label: string; value: string | number; sub?: string;
  trend?: number[]; color?: string; icon?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{icon} {label}</span>
        {trend && <Sparkline data={trend} color={color || '#2563eb'} />}
      </div>
      <div className="text-2xl font-bold" style={{ color: color || '#1e3a8a' }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TestManagementPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'suites' | 'rtm' | 'environments' | 'cicd'>('overview');

  // ── Overview state ──
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [flakiness, setFlakiness] = useState<FlakinessEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // ── Suites state ──
  const [suites, setSuites] = useState<Suite[]>([]);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteType, setNewSuiteType] = useState('regression');
  const [suiteRunLog, setSuiteRunLog] = useState<{ suiteId: string; lines: string[]; status: string }>({ suiteId: '', lines: [], status: '' });
  const [runningSuiteId, setRunningSuiteId] = useState<string | null>(null);

  // ── RTM state ──
  const [rtm, setRtm] = useState<RTMRow[]>([]);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqPriority, setNewReqPriority] = useState('P2');
  const [newReqTicket, setNewReqTicket] = useState('');
  const [linkTestId, setLinkTestId] = useState('');
  const [linkTestName, setLinkTestName] = useState('');
  const [linkReqId, setLinkReqId] = useState('');

  // ── Environments state ──
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvUrl, setNewEnvUrl] = useState('');
  const [newEnvType, setNewEnvType] = useState<'dev' | 'staging' | 'production'>('staging');

  // ── CI/CD state ──
  const [cicdType, setCicdType] = useState<'github' | 'azure' | 'gitlab' | 'jenkins'>('github');
  const [cicdYaml, setCicdYaml] = useState('');
  const [cicdCopied, setCicdCopied] = useState(false);
  const [cicdProjectName, setCicdProjectName] = useState('my-tests');
  const [cicdSuiteType, setCicdSuiteType] = useState('');

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadOverview = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const [m, t, f, h] = await Promise.all([
        fetch('/api/tm/metrics').then(r => r.json()),
        fetch('/api/tm/history/trends').then(r => r.json()),
        fetch('/api/tm/flakiness').then(r => r.json()),
        fetch('/api/tm/history?limit=50').then(r => r.json()),
      ]);
      setMetrics(m);
      setTrends(t);
      setFlakiness(f);
      setHistory(h);
    } catch {}
    setLoadingMetrics(false);
  }, []);

  const loadSuites = useCallback(async () => {
    const data = await fetch('/api/tm/suites').then(r => r.json()).catch(() => []);
    setSuites(data);
  }, []);

  const loadRTM = useCallback(async () => {
    const data = await fetch('/api/tm/rtm').then(r => r.json()).catch(() => []);
    setRtm(data);
  }, []);

  const loadEnvironments = useCallback(async () => {
    const data = await fetch('/api/tm/environments').then(r => r.json()).catch(() => []);
    setEnvironments(data);
  }, []);

  useEffect(() => {
    if (activeTab === 'overview')      loadOverview();
    else if (activeTab === 'suites')   loadSuites();
    else if (activeTab === 'rtm')      loadRTM();
    else if (activeTab === 'environments') loadEnvironments();
  }, [activeTab]);

  // ── Suite actions ───────────────────────────────────────────────────────────

  const createSuite = async () => {
    if (!newSuiteName.trim()) return;
    await fetch('/api/tm/suites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSuiteName.trim(), type: newSuiteType }),
    });
    setNewSuiteName('');
    loadSuites();
  };

  const deleteSuite = async (id: string) => {
    await fetch(`/api/tm/suites/${id}`, { method: 'DELETE' });
    loadSuites();
  };

  const runSuite = (suite: Suite) => {
    setRunningSuiteId(suite.id);
    setSuiteRunLog({ suiteId: suite.id, lines: [`▶ Starting suite: ${suite.name}`], status: 'running' });

    const es = new EventSource(`/api/tm/suites/${suite.id}/run`);
    // Note: POST with SSE requires a different approach — use fetch with streaming
    fetch(`/api/tm/suites/${suite.id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(async res => {
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop() || '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'test_start')  setSuiteRunLog(prev => ({ ...prev, lines: [...prev.lines, `⏳ Running: ${evt.testId}`] }));
            if (evt.type === 'test_done')   setSuiteRunLog(prev => ({ ...prev, lines: [...prev.lines, `${evt.status === 'passed' ? '✅' : '❌'} ${evt.testName} (${Math.round(evt.duration/1000)}s)`] }));
            if (evt.type === 'suite_done') {
              setSuiteRunLog(prev => ({ ...prev, status: 'done', lines: [...prev.lines, `\n✅ ${evt.passed} passed  ❌ ${evt.failed} failed`] }));
              setRunningSuiteId(null);
              loadOverview();
            }
            if (evt.type === 'log') setSuiteRunLog(prev => ({ ...prev, lines: [...prev.lines.slice(-50)] })); // trim log
          } catch {}
        }
      }
    }).catch(err => {
      setSuiteRunLog(prev => ({ ...prev, status: 'error', lines: [...prev.lines, `❌ Error: ${err.message}`] }));
      setRunningSuiteId(null);
    });
  };

  // ── RTM actions ─────────────────────────────────────────────────────────────

  const createRequirement = async () => {
    if (!newReqTitle.trim()) return;
    await fetch('/api/tm/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newReqTitle.trim(), priority: newReqPriority, ticketId: newReqTicket || undefined }),
    });
    setNewReqTitle(''); setNewReqTicket('');
    loadRTM();
  };

  const deleteRequirement = async (id: string) => {
    await fetch(`/api/tm/requirements/${id}`, { method: 'DELETE' });
    loadRTM();
  };

  const linkTest = async () => {
    if (!linkReqId || !linkTestId.trim()) return;
    await fetch('/api/tm/rtm/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId: linkReqId, testId: linkTestId.trim(), testName: linkTestName.trim() || linkTestId.trim() }),
    });
    setLinkTestId(''); setLinkTestName(''); setLinkReqId('');
    loadRTM();
  };

  const unlinkTest = async (requirementId: string, testId: string) => {
    await fetch('/api/tm/rtm/link', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId, testId }),
    });
    loadRTM();
  };

  // ── Environment actions ──────────────────────────────────────────────────────

  const createEnvironment = async () => {
    if (!newEnvName.trim() || !newEnvUrl.trim()) return;
    await fetch('/api/tm/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEnvName.trim(), baseUrl: newEnvUrl.trim(), type: newEnvType }),
    });
    setNewEnvName(''); setNewEnvUrl('');
    loadEnvironments();
  };

  const deleteEnvironment = async (id: string) => {
    await fetch(`/api/tm/environments/${id}`, { method: 'DELETE' });
    loadEnvironments();
  };

  const setDefaultEnvironment = async (id: string) => {
    await fetch(`/api/tm/environments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    loadEnvironments();
  };

  // ── CI/CD actions ────────────────────────────────────────────────────────────

  const generateCICD = async () => {
    const data = await fetch('/api/tm/cicd/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: cicdType, projectName: cicdProjectName, suiteType: cicdSuiteType || undefined }),
    }).then(r => r.json());
    setCicdYaml(data.yaml || '');
  };

  const copyCICD = () => {
    navigator.clipboard.writeText(cicdYaml);
    setCicdCopied(true);
    setTimeout(() => setCicdCopied(false), 2000);
  };

  // ── Coverage badge ───────────────────────────────────────────────────────────

  const coverageBadge = (cov: string) => {
    if (cov === 'covered')  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✅ Covered</span>;
    if (cov === 'failing')  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">❌ Failing</span>;
    if (cov === 'partial')  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">⚠ Partial</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">○ No Tests</span>;
  };

  const tabs = [
    { id: 'overview',      label: '📊 Overview',     desc: 'Metrics & trends' },
    { id: 'suites',        label: '🗂 Suites',        desc: 'Test grouping & runner' },
    { id: 'rtm',           label: '🔗 RTM',           desc: 'Requirements traceability' },
    { id: 'environments',  label: '🌐 Environments',  desc: 'Dev / staging / prod' },
    { id: 'cicd',          label: '⚙️ CI/CD',          desc: 'Pipeline YAML' },
  ] as const;

  return (
    <div className="flex h-full bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex-1 flex flex-col bg-background text-foreground overflow-hidden">
        <DashboardHeader />

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-500 text-xs font-semibold transition-all"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-blue-900">Test Management</h1>
              <p className="text-xs text-gray-400 mt-0.5">Coverage • Traceability • Suites • Environments • CI/CD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metrics && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {metrics.passRate30}% pass rate
                </span>
                <span>{metrics.totalRuns} total runs</span>
              </div>
            )}
            <a href="/recorder" className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors">
              + Record New Test
            </a>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-1 mt-3">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loadingMetrics ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading metrics...</div>
            ) : metrics ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="Pass Rate (30d)" icon="✅"
                    value={`${metrics.passRate30}%`}
                    sub={`${metrics.passedLast30} passed / ${metrics.failedLast30} failed`}
                    trend={trends.filter(t => t.passRate !== null).map(t => t.passRate!)}
                    color={metrics.passRate30 >= 80 ? '#22c55e' : metrics.passRate30 >= 60 ? '#f59e0b' : '#ef4444'}
                  />
                  <KpiCard
                    label="Coverage" icon="📋"
                    value={`${metrics.coverage}%`}
                    sub={`${metrics.linkedTests} of ${metrics.requirementCount} requirements tested`}
                    color={metrics.coverage >= 80 ? '#22c55e' : '#f59e0b'}
                  />
                  <KpiCard
                    label="Flaky Tests" icon="⚠️"
                    value={metrics.flakyCount}
                    sub={`of ${metrics.totalTests} total tests`}
                    color={metrics.flakyCount === 0 ? '#22c55e' : '#f59e0b'}
                  />
                  <KpiCard
                    label="Avg Duration" icon="⏱"
                    value={`${metrics.avgDurationSec}s`}
                    sub={`${metrics.totalRuns} total executions`}
                    color="#60a5fa"
                  />
                </div>

                {/* Trend Chart */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-blue-900">Pass Rate Trend (Last 30 Days)</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Daily pass/fail breakdown</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-emerald-400 rounded inline-block" /> Passed</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-400 rounded inline-block" /> Failed</span>
                    </div>
                  </div>
                  <div className="relative h-32">
                    {trends.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">No execution data yet — run your first test</div>
                    ) : (
                      <svg width="100%" height="100%" viewBox="0 0 800 128" preserveAspectRatio="none" className="overflow-visible">
                        {(() => {
                          const activeDays = trends.filter(t => t.total > 0);
                          if (activeDays.length < 2) return null;
                          const maxTotal = Math.max(...activeDays.map(t => t.total), 1);
                          const W = 800; const H = 128; const step = W / (trends.length - 1);
                          const passedPts = trends.map((t, i) => `${i * step},${H - (t.passed / maxTotal) * H}`).join(' ');
                          const failedPts = trends.map((t, i) => `${i * step},${H - (t.failed / maxTotal) * H}`).join(' ');
                          return (
                            <>
                              <polyline points={passedPts} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
                              <polyline points={failedPts} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
                              {/* X-axis labels - show every 7th */}
                              {trends.filter((_, i) => i % 7 === 0).map((t, i) => (
                                <text key={t.date} x={i * 7 * step} y={H + 16} fontSize="9" fill="#64748b" textAnchor="middle">{t.date.slice(5)}</text>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Two-column: Flakiness + Recent Runs */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Flakiness Table */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-blue-900">⚠️ Flakiness Report</h3>
                      <span className="text-[10px] text-gray-400">Stability based on last 10 runs</span>
                    </div>
                    <div className="overflow-auto max-h-52">
                      {flakiness.length === 0 ? (
                        <div className="p-4 text-xs text-gray-400 text-center">No history yet</div>
                      ) : flakiness.map(f => (
                        <div key={f.testId} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.stability >= 80 ? 'bg-emerald-400' : f.stability >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 truncate">{f.testName}</p>
                            <p className="text-[10px] text-gray-400">{f.runCount} runs</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className={`text-xs font-bold ${f.stability >= 80 ? 'text-emerald-400' : f.stability >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{f.stability}%</p>
                            <p className="text-[10px] text-gray-400">stability</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Runs */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-bold text-blue-900">🕐 Recent Executions</h3>
                    </div>
                    <div className="overflow-auto max-h-52">
                      {history.length === 0 ? (
                        <div className="p-4 text-xs text-gray-400 text-center">No history yet — run a test to see results</div>
                      ) : history.slice(0, 20).map(h => (
                        <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100/60">
                          <span className="text-sm">{h.status === 'passed' ? '✅' : h.status === 'failed' ? '❌' : '⊘'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 truncate">{h.testName}</p>
                            <p className="text-[10px] text-gray-400">{h.environment} · {new Date(h.runAt).toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{Math.round(h.duration / 1000)}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">No metrics available yet</div>
            )}
          </div>
        )}

        {/* ── SUITES TAB ── */}
        {activeTab === 'suites' && (
          <div className="space-y-4">
            {/* Create Suite */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-3">+ Create Test Suite</h3>
              <div className="flex items-center gap-3">
                <input
                  value={newSuiteName} onChange={e => setNewSuiteName(e.target.value)}
                  placeholder="Suite name (e.g. Sprint 24 Regression)"
                  className="flex-1 bg-white border border-gray-300 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none"
                />
                <select value={newSuiteType} onChange={e => setNewSuiteType(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none">
                  <option value="smoke">🔥 Smoke</option>
                  <option value="regression">📦 Regression</option>
                  <option value="sanity">✅ Sanity</option>
                  <option value="sprint">🏃 Sprint</option>
                  <option value="custom">⚙️ Custom</option>
                </select>
                <button onClick={createSuite}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                  Create
                </button>
              </div>
            </div>

            {/* Suite Run Log */}
            {suiteRunLog.suiteId && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${suiteRunLog.status === 'running' ? 'bg-yellow-400 animate-pulse' : suiteRunLog.status === 'done' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-xs font-bold text-gray-600">Suite Execution Log</span>
                </div>
                <div className="font-mono text-[11px] text-gray-600 space-y-0.5 max-h-40 overflow-auto">
                  {suiteRunLog.lines.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
            )}

            {/* Suite Cards */}
            {suites.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-400 text-sm">No suites yet — create your first test suite above</p>
                <p className="text-gray-400 text-xs mt-2">Suites let you group related tests and run them together</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suites.map(suite => (
                  <div key={suite.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-blue-900">{suite.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 capitalize">{suite.type}</span>
                          <span className="text-[10px] text-gray-400">{suite.testIds.length} tests</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => runSuite(suite)}
                          disabled={runningSuiteId === suite.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                        >
                          {runningSuiteId === suite.id ? '⟳ Running...' : '▶ Run All'}
                        </button>
                        <button onClick={() => deleteSuite(suite.id)}
                          className="px-2 py-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs transition-colors">
                          🗑
                        </button>
                      </div>
                    </div>
                    {suite.testIds.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">No tests added yet — save tests from the recorder with suite assignment</p>
                    ) : (
                      <div className="text-[10px] text-gray-400 space-y-0.5 max-h-20 overflow-auto">
                        {suite.testIds.map(id => <div key={id} className="flex items-center gap-1"><span className="text-gray-400">·</span> {id}</div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RTM TAB ── */}
        {activeTab === 'rtm' && (
          <div className="space-y-4">
            {/* RTM Summary Bar */}
            {rtm.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total', count: rtm.length, color: 'text-gray-600' },
                  { label: 'Covered', count: rtm.filter(r => r.coverage === 'covered').length, color: 'text-emerald-400' },
                  { label: 'Failing', count: rtm.filter(r => r.coverage === 'failing').length, color: 'text-red-400' },
                  { label: 'No Tests', count: rtm.filter(r => r.coverage === 'none').length, color: 'text-gray-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/60 border border-gray-200 rounded-lg px-4 py-2.5 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                    <p className="text-[10px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Requirement */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-3">+ Add Requirement</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input value={newReqTitle} onChange={e => setNewReqTitle(e.target.value)}
                  placeholder="Requirement title"
                  className="flex-1 min-w-48 bg-white border border-gray-300 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                <input value={newReqTicket} onChange={e => setNewReqTicket(e.target.value)}
                  placeholder="JIRA/ADO ticket (optional)"
                  className="w-44 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                <select value={newReqPriority} onChange={e => setNewReqPriority(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none">
                  <option>P0</option><option>P1</option><option>P2</option><option>P3</option>
                </select>
                <button onClick={createRequirement}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Add</button>
              </div>
            </div>

            {/* Link Test to Requirement */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-3">🔗 Link Test to Requirement</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={linkReqId} onChange={e => setLinkReqId(e.target.value)}
                  className="flex-1 min-w-48 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none">
                  <option value="">— Select requirement —</option>
                  {rtm.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
                <input value={linkTestId} onChange={e => setLinkTestId(e.target.value)}
                  placeholder="Test ID (from recorder)"
                  className="w-44 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                <input value={linkTestName} onChange={e => setLinkTestName(e.target.value)}
                  placeholder="Test name (optional)"
                  className="w-44 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                <button onClick={linkTest}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">Link</button>
              </div>
            </div>

            {/* RTM Matrix */}
            {rtm.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-400 text-sm">No requirements yet</p>
                <p className="text-gray-400 text-xs mt-2">Add requirements above and link them to your recorded tests to build a traceability matrix</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Priority</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Requirement</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Ticket</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Linked Tests</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">Coverage</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rtm.map(row => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.priority === 'P0' ? 'bg-red-500/20 text-red-400' : row.priority === 'P1' ? 'bg-orange-500/20 text-orange-400' : row.priority === 'P2' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-100 text-gray-500'}`}>
                            {row.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{row.title}</td>
                        <td className="px-4 py-3 text-gray-500">{row.ticketId ? (
                          <span className="font-mono text-blue-400">{row.ticketId}</span>
                        ) : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {row.tests.length === 0 ? (
                              <span className="text-gray-400 italic">No tests linked</span>
                            ) : row.tests.map(t => (
                              <div key={t.testId} className="flex items-center gap-2">
                                <span>{t.lastStatus === 'passed' ? '✅' : t.lastStatus === 'failed' ? '❌' : '○'}</span>
                                <span className="text-gray-600 truncate max-w-32">{t.testName}</span>
                                <button onClick={() => unlinkTest(row.id, t.testId)} className="text-gray-400 hover:text-red-400 text-[10px] transition-colors">✕</button>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">{coverageBadge(row.coverage)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteRequirement(row.id)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ENVIRONMENTS TAB ── */}
        {activeTab === 'environments' && (
          <div className="space-y-4">
            {/* Add Environment */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-3">+ Add Environment</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input value={newEnvName} onChange={e => setNewEnvName(e.target.value)}
                  placeholder="Name (e.g. Staging)"
                  className="w-44 bg-white border border-gray-300 focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                <input value={newEnvUrl} onChange={e => setNewEnvUrl(e.target.value)}
                  placeholder="Base URL (https://staging.app.com)"
                  className="flex-1 min-w-64 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                <select value={newEnvType} onChange={e => setNewEnvType(e.target.value as any)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none">
                  <option value="dev">🔧 Dev</option>
                  <option value="staging">🧪 Staging</option>
                  <option value="production">🚀 Production</option>
                  <option value="custom">⚙️ Custom</option>
                </select>
                <button onClick={createEnvironment}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Add</button>
              </div>
            </div>

            {environments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-400 text-sm">No environments configured</p>
                <p className="text-gray-400 text-xs mt-2">Add Dev, Staging, and Production URLs to run the same tests across environments</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {environments.map(env => (
                  <div key={env.id} className={`bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm ${env.isDefault ? 'border-blue-400' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-blue-900">{env.name}</h4>
                          {env.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">default</span>}
                        </div>
                        <span className="text-[10px] text-gray-400 capitalize">{env.type}</span>
                      </div>
                      <button onClick={() => deleteEnvironment(env.id)} className="text-gray-400 hover:text-red-400 text-xs transition-colors">🗑</button>
                    </div>
                    <div className="bg-blue-50 rounded-lg px-3 py-2 font-mono text-xs text-blue-700 break-all border border-blue-100">{env.baseUrl}</div>
                    {!env.isDefault && (
                      <button onClick={() => setDefaultEnvironment(env.id)}
                        className="w-full py-1.5 rounded-lg border border-gray-300 hover:border-blue-500 text-gray-500 hover:text-blue-600 text-xs transition-all">
                        Set as Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CI/CD TAB ── */}
        {activeTab === 'cicd' && (
          <div className="space-y-4">
            {/* Config */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-blue-900 mb-4">Generate CI/CD Pipeline</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">CI/CD Platform</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['github', '🐙 GitHub Actions'], ['azure', '🔷 Azure Pipelines'], ['gitlab', '🦊 GitLab CI'], ['jenkins', '🔨 Jenkins']] as const).map(([id, label]) => (
                      <button key={id} onClick={() => setCicdType(id)}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${cicdType === id ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-300 text-gray-500 hover:border-blue-400'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Project Name</label>
                    <input value={cicdProjectName} onChange={e => setCicdProjectName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Suite / Test Command Override (optional)</label>
                    <input value={cicdSuiteType} onChange={e => setCicdSuiteType(e.target.value)}
                      placeholder="e.g. regression, smoke"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none" />
                  </div>
                </div>
              </div>
              <button onClick={generateCICD}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold transition-all">
                ⚙️ Generate YAML
              </button>
            </div>

            {/* YAML Output */}
            {cicdYaml && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-900">
                      {cicdType === 'github' ? '🐙 .github/workflows/playwright.yml' :
                       cicdType === 'azure' ? '🔷 azure-pipelines.yml' :
                       cicdType === 'gitlab' ? '🦊 .gitlab-ci.yml' :
                       '🔨 Jenkinsfile'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyCICD}
                      className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors">
                      {cicdCopied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(cicdYaml)}`}
                      download={cicdType === 'github' ? 'playwright.yml' : cicdType === 'azure' ? 'azure-pipelines.yml' : cicdType === 'gitlab' ? '.gitlab-ci.yml' : 'Jenkinsfile'}
                      className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors">
                      ↓ Download
                    </a>
                  </div>
                </div>
                <pre className="p-4 text-[11px] font-mono text-gray-600 overflow-auto max-h-[600px] leading-relaxed whitespace-pre">{cicdYaml}</pre>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50/40 border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-blue-900 mb-3">📋 Setup Instructions</h4>
              <div className="space-y-3 text-xs text-gray-500">
                {cicdType === 'github' && <>
                  <p>1. Save the YAML to <code className="text-blue-300">.github/workflows/playwright.yml</code> in your project repo</p>
                  <p>2. Add secrets: <code className="text-blue-300">Settings → Secrets → Actions → New secret</code> → <code className="text-amber-300">TEST_PASSWORD</code></p>
                  <p>3. Add variables: <code className="text-blue-300">Settings → Variables → Actions</code> → <code className="text-amber-300">BASE_URL</code></p>
                  <p>4. Push to main or create a PR — tests will run automatically</p>
                </>}
                {cicdType === 'azure' && <>
                  <p>1. Save the YAML to <code className="text-blue-300">azure-pipelines.yml</code> in your repository root</p>
                  <p>2. Create pipeline: Azure DevOps → Pipelines → New Pipeline → select your repo</p>
                  <p>3. Add variables: Pipeline → Edit → Variables → <code className="text-amber-300">TEST_PASSWORD</code>, <code className="text-amber-300">BASE_URL</code></p>
                  <p>4. Enable "Allow access to all pipelines" for variable groups if used</p>
                </>}
                {cicdType === 'gitlab' && <>
                  <p>1. Save as <code className="text-blue-300">.gitlab-ci.yml</code> in your repository root</p>
                  <p>2. Add CI/CD variables: Settings → CI/CD → Variables → <code className="text-amber-300">TEST_PASSWORD</code>, <code className="text-amber-300">BASE_URL</code></p>
                  <p>3. Pipelines will trigger automatically on push and merge requests</p>
                </>}
                {cicdType === 'jenkins' && <>
                  <p>1. Save as <code className="text-blue-300">Jenkinsfile</code> in your repository root</p>
                  <p>2. Create credentials: Jenkins → Manage → Credentials → <code className="text-amber-300">TEST_PASSWORD</code></p>
                  <p>3. Create pipeline job pointing to your repository</p>
                  <p>4. Install the NodeJS and Docker plugins if not already installed</p>
                </>}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
