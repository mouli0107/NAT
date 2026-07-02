import { useState, useRef, useEffect } from 'react';
import { Rocket, Play, Check, AlertTriangle, Circle, Copy, Download, Loader2, Globe, ListChecks } from 'lucide-react';

// ── ASTRA Autopilot ───────────────────────────────────────────────────────────
// Agentic, live-grounded test authoring. Paste plain-English steps + a URL; the
// agent drives the real app, verifies every selector by acting, and emits runnable
// Playwright. Steps it can't ground are flagged (never faked).

interface GroundedStep {
  index: number;
  raw: string;
  status: 'grounded' | 'flagged' | 'setup';
  locator?: string;
  code?: string;
  detail: string;
}
interface RunResult {
  targetUrl: string; title: string; testName: string;
  steps: GroundedStep[]; script: string; grounded: number; flagged: number;
}

const C = {
  bg: '#0A1628', panel: '#0D1F3C', border: '#1E3A5F', accent: '#00BFFF',
  text: '#C0D8F0', dim: '#7A9CC0', faint: '#4A6A8A',
  green: '#00C896', amber: '#FFC080', red: '#FF8080',
};

const EXAMPLE = `Open chrome browser
Navigate to nousinfosystems.com
click careers page
Enter first name and last name
click on submit
click on news, events, contact us links`;

export default function AutopilotPage() {
  const [targetUrl, setTargetUrl] = useState('https://www.nousinfosystems.com');
  const [steps, setSteps] = useState(EXAMPLE);
  const [testName, setTestName] = useState('');
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<GroundedStep[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => () => esRef.current?.close(), []);

  const run = async () => {
    setRunning(true); setLive([]); setResult(null); setError(null); setCopied(false);
    esRef.current?.close();
    try {
      const r = await fetch('/api/autopilot/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, steps, testName: testName || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to start'); setRunning(false); return; }
      const es = new EventSource(data.streamUrl);
      esRef.current = es;
      es.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (ev.type === 'step') setLive(prev => [...prev, ev.step]);
        else if (ev.type === 'done') { setResult(ev.result); setRunning(false); es.close(); }
        else if (ev.type === 'error') { setError(ev.message); setRunning(false); es.close(); }
      };
      es.onerror = () => { es.close(); setRunning(false); };
    } catch (e: any) { setError(e.message); setRunning(false); }
  };

  const shownSteps = result ? result.steps : live;
  const copy = () => { if (result) { navigator.clipboard.writeText(result.script); setCopied(true); setTimeout(() => setCopied(false), 1800); } };
  const download = () => {
    if (!result) return;
    const blob = new Blob([result.script], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (result.testName || 'autopilot').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.spec.ts';
    a.click(); URL.revokeObjectURL(a.href);
  };

  const dot = (s: GroundedStep['status']) =>
    s === 'grounded' ? <Check className="w-3.5 h-3.5" style={{ color: C.green }} />
    : s === 'flagged' ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: C.amber }} />
    : <Circle className="w-3 h-3" style={{ color: C.faint }} />;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }} className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl"
               style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}55`, boxShadow: `0 0 22px -6px ${C.accent}` }}>
            <Rocket className="w-6 h-6" style={{ color: C.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight"
                style={{ background: `linear-gradient(90deg, #fff, ${C.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ASTRA Autopilot
            </h1>
            <p className="text-xs" style={{ color: C.dim }}>
              Agentic · live-grounded test authoring — paste plain-English steps, get verified Playwright.
            </p>
          </div>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '380px 1fr' }}>
          {/* ── Input ── */}
          <div className="rounded-2xl p-5 space-y-4 self-start"
               style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <label className="block">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: C.dim }}>
                <Globe className="w-3.5 h-3.5" /> Target URL
              </span>
              <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} spellCheck={false}
                     className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                     style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: C.dim }}>
                <ListChecks className="w-3.5 h-3.5" /> Manual steps (one per line)
              </span>
              <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={9} spellCheck={false}
                        className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none resize-y"
                        style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, lineHeight: 1.6 }} />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: C.dim }}>Test name (optional)</span>
              <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Nous smoke — navigation"
                     className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                     style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />
            </label>
            <button onClick={run} disabled={running || !targetUrl.trim() || !steps.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                    style={{ background: running ? C.border : C.accent, color: running ? C.dim : C.bg,
                             boxShadow: running ? 'none' : `0 6px 20px -6px ${C.accent}`, cursor: running ? 'default' : 'pointer' }}>
              {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Grounding against live app…</>
                       : <><Play className="w-4 h-4" /> Generate Playwright</>}
            </button>
            {error && <div className="text-xs rounded-lg px-3 py-2" style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}44` }}>{error}</div>}
          </div>

          {/* ── Output ── */}
          <div className="space-y-4 min-w-0">
            {/* Live grounding feed */}
            {(running || shownSteps.length > 0) && (
              <div className="rounded-2xl p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>Live grounding</span>
                  {result && (
                    <span className="text-xs font-mono">
                      <span style={{ color: C.green }}>{result.grounded} grounded</span>
                      <span style={{ color: C.faint }}> · </span>
                      <span style={{ color: result.flagged ? C.amber : C.faint }}>{result.flagged} flagged</span>
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {shownSteps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                         style={{ background: C.bg, borderLeft: `2px solid ${s.status === 'grounded' ? C.green : s.status === 'flagged' ? C.amber : C.faint}` }}>
                      <span className="mt-0.5">{dot(s.status)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm" style={{ color: C.text }}>{s.raw}</div>
                        {s.locator && <div className="text-[11px] font-mono truncate" style={{ color: C.accent }}>{s.locator}</div>}
                        <div className="text-[11px]" style={{ color: s.status === 'flagged' ? C.amber : C.dim }}>{s.detail}</div>
                      </div>
                    </div>
                  ))}
                  {running && <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: C.dim }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> walking the app…
                  </div>}
                </div>
              </div>
            )}

            {/* Generated script */}
            {result && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#06101F', border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between px-4 py-2" style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
                  <span className="text-xs font-mono" style={{ color: C.dim }}>{(result.testName || 'autopilot').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.spec.ts</span>
                  <div className="flex items-center gap-2">
                    <button onClick={copy} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: `${C.accent}18`, color: C.accent }}>
                      <Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={download} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: `${C.accent}18`, color: C.accent }}>
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </div>
                <pre className="text-xs p-4 overflow-auto font-mono leading-relaxed" style={{ color: '#B8D4F0', maxHeight: '46vh' }}>{result.script}</pre>
              </div>
            )}

            {!running && shownSteps.length === 0 && !error && (
              <div className="rounded-2xl p-10 text-center" style={{ background: C.panel, border: `1px dashed ${C.border}`, color: C.faint }}>
                <Rocket className="w-8 h-8 mx-auto mb-3" style={{ color: C.faint }} />
                <div className="text-sm">Paste your manual steps and hit <span style={{ color: C.accent }}>Generate Playwright</span>.</div>
                <div className="text-[11px] mt-1">The agent drives the real app, verifies each selector by acting, and writes the script.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
