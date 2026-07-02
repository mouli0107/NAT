import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import {
  Rocket, Play, Check, AlertTriangle, Circle, Copy, Download, Loader2, Globe,
  ListChecks, Upload, FileSpreadsheet, Bug, Boxes, ArrowLeft, Settings, Link2, Video,
} from 'lucide-react';

interface GroundedStep { index: number; raw: string; status: 'grounded' | 'flagged' | 'setup'; locator?: string; code?: string; detail: string; }
interface RunResult { targetUrl: string; title: string; testName: string; steps: GroundedStep[]; script: string; grounded: number; flagged: number; }
interface Connected { id: string; platform: string; name: string; }
type Source = 'paste' | 'upload' | 'jira' | 'ado';

const EXAMPLE = `Open chrome browser
Navigate to nousinfosystems.com
click careers page
Enter first name and last name
click on submit
click on news, events, contact us links`;

export default function AutopilotPage() {
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const [source, setSource] = useState<Source>('paste');
  const [connected, setConnected] = useState<Connected[]>([]);
  const [targetUrl, setTargetUrl] = useState('https://www.nousinfosystems.com');
  const [steps, setSteps] = useState(EXAMPLE);
  const [testName, setTestName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<GroundedStep[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);   // live CDP screencast frame (data URL)
  const esRef = useRef<EventSource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/integrations/connected').then(r => r.json()).then(d => {
      if (d?.success && Array.isArray(d.integrations)) setConnected(d.integrations);
    }).catch(() => {});
    return () => { esRef.current?.close(); wsRef.current?.close(); };
  }, []);

  const has = (rx: RegExp) => connected.find(c => rx.test(c.platform) || rx.test(c.name));
  const jira = has(/jira/i);
  const ado = has(/azure|ado|devops/i);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setUploadNote(null);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 5).forEach(f => fd.append('files', f));
      const r = await fetch('/api/tests/upload-context', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadNote(d.error || 'Upload failed'); return; }
      const text = (d.documents || []).map((x: any) => x.content).join('\n\n').trim();
      if (text) {
        setSteps(text); setSource('paste');
        setUploadNote(`Extracted ${d.documents.length} file(s) — review the steps below, then Generate.`);
      } else setUploadNote('No text could be extracted from that file.');
    } catch (e: any) { setUploadNote(e.message); }
    finally { setUploading(false); }
  };

  const run = async () => {
    setRunning(true); setLive([]); setResult(null); setError(null); setCopied(false); setFrame(null);
    esRef.current?.close(); wsRef.current?.close();
    try {
      const r = await fetch('/api/autopilot/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, steps, testName: testName || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to start'); setRunning(false); return; }
      // Live video — CDP screencast frames over WebSocket.
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws/autopilot?sessionId=${data.sessionId}`);
      ws.onmessage = (m) => setFrame('data:image/jpeg;base64,' + m.data);
      ws.onerror = () => { /* ignore */ };
      wsRef.current = ws;
      // Step + result events over SSE.
      const es = new EventSource(data.streamUrl); esRef.current = es;
      es.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (ev.type === 'step') setLive(prev => [...prev, ev.step]);
        else if (ev.type === 'done') { setResult(ev.result); setRunning(false); es.close(); ws.close(); }
        else if (ev.type === 'error') { setError(ev.message); setRunning(false); es.close(); ws.close(); }
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
    s === 'grounded' ? <Check className="w-4 h-4 text-emerald-600" />
    : s === 'flagged' ? <AlertTriangle className="w-4 h-4 text-amber-500" />
    : <Circle className="w-3 h-3 text-gray-400" />;

  const SourceTab = ({ id, icon: Icon, label, sub, disabled }: { id: Source; icon: any; label: string; sub?: string; disabled?: boolean }) => (
    <button onClick={() => !disabled && setSource(id)} disabled={disabled}
      className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border transition-all text-center"
      style={{
        borderColor: source === id ? '#4f46e5' : '#e5e7eb',
        background: source === id ? '#eef2ff' : disabled ? '#f9fafb' : '#fff',
        opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      <Icon className="w-4 h-4" style={{ color: source === id ? '#4f46e5' : '#6b7280' }} />
      <span className="text-[11px] font-semibold" style={{ color: source === id ? '#4f46e5' : '#374151' }}>{label}</span>
      {sub && <span className="text-[9px]" style={{ color: disabled ? '#9ca3af' : '#10b981' }}>{sub}</span>}
    </button>
  );

  return (
    <div className="flex h-full bg-background">
      <Sidebar isCollapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden text-gray-900" style={{ background: '#f9fafb' }}>
        <DashboardHeader />

        {/* Page header */}
        <div className="bg-white border-b px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation('/dashboard')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
            <div className="w-px h-5" style={{ background: '#e5e7eb' }} />
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: '#eef2ff' }}>
                <Rocket className="w-5 h-5" style={{ color: '#4f46e5' }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Autopilot</h1>
                <p className="text-sm" style={{ color: '#4f46e5' }}>Agentic · live-grounded · manual steps → verified Playwright</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-6 max-w-[1400px] mx-auto" style={{ gridTemplateColumns: '400px 1fr' }}>

            {/* ── Input ── */}
            <div className="bg-white rounded-xl border p-5 space-y-4 self-start" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px #0000000a' }}>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Test case source</span>
                <div className="flex gap-2">
                  <SourceTab id="paste" icon={ListChecks} label="Paste" />
                  <SourceTab id="upload" icon={FileSpreadsheet} label="Upload" sub="Excel/Word" />
                  <SourceTab id="jira" icon={Bug} label="Jira" sub={jira ? 'Connected' : 'Not set'} disabled={!jira} />
                  <SourceTab id="ado" icon={Boxes} label="Azure DevOps" sub={ado ? 'Connected' : 'Not set'} disabled={!ado} />
                </div>
              </div>

              {source === 'paste' && (
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Manual steps (one per line)</span>
                  <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={9} spellCheck={false}
                    className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none border focus:border-indigo-400"
                    style={{ borderColor: '#e5e7eb', lineHeight: 1.6 }} />
                </label>
              )}

              {source === 'upload' && (
                <div>
                  <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.docx,.pdf,.txt,.md" className="hidden"
                    onChange={e => onUpload(e.target.files)} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full flex flex-col items-center gap-2 py-7 rounded-lg border-2 border-dashed transition-colors hover:bg-indigo-50/50"
                    style={{ borderColor: '#c7d2fe' }}>
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> : <Upload className="w-6 h-6 text-indigo-500" />}
                    <span className="text-sm font-medium text-gray-700">{uploading ? 'Extracting…' : 'Upload manual test cases'}</span>
                    <span className="text-[11px] text-gray-400">Excel, Word, PDF, CSV, TXT — up to 5 files</span>
                  </button>
                  {uploadNote && <div className="mt-2 text-[11px] text-gray-600">{uploadNote}</div>}
                </div>
              )}

              {(source === 'jira' || source === 'ado') && (
                <div className="rounded-lg border p-4 text-sm" style={{ borderColor: '#e5e7eb', background: '#f8fafc' }}>
                  <div className="flex items-center gap-2 mb-1 font-medium text-gray-800">
                    {source === 'jira' ? <Bug className="w-4 h-4 text-indigo-500" /> : <Boxes className="w-4 h-4 text-indigo-500" />}
                    {source === 'jira' ? 'Jira' : 'Azure DevOps'}
                    <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                      Connected: {(source === 'jira' ? jira : ado)?.name}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-500">
                    Pull manual test cases directly from your connected {source === 'jira' ? 'Jira' : 'Azure DevOps'} instance
                    (test-case picker) — importing their steps into the box, then Generate. Use <b>Upload</b> or <b>Paste</b> meanwhile.
                  </p>
                </div>
              )}

              {!jira && !ado && (source === 'paste' || source === 'upload') && (
                <button onClick={() => setLocation('/integration-management')} className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-indigo-600">
                  <Settings className="w-3 h-3" /> Connect Jira / Azure DevOps in Settings to pull test cases
                </button>
              )}

              <label className="block">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5"><Globe className="w-3.5 h-3.5" /> Target URL</span>
                <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} spellCheck={false}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none border focus:border-indigo-400" style={{ borderColor: '#e5e7eb' }} />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Test name (optional)</span>
                <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Nous smoke — navigation"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border focus:border-indigo-400" style={{ borderColor: '#e5e7eb' }} />
              </label>

              <button onClick={run} disabled={running || !targetUrl.trim() || !steps.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold text-white transition-all"
                style={{ background: running ? '#9ca3af' : '#4f46e5', boxShadow: running ? 'none' : '0 6px 18px -6px #4f46e5', cursor: running ? 'default' : 'pointer' }}>
                {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Grounding against live app…</> : <><Play className="w-4 h-4" /> Generate Playwright</>}
              </button>
              {error && <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
            </div>

            {/* ── Output ── */}
            <div className="space-y-4 min-w-0">
              {/* Live browser video (CDP screencast) */}
              {(running || frame) && (
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px #0000000a' }}>
                  <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"><Video className="w-3.5 h-3.5" /> Live browser</span>
                    {running && <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE</span>}
                  </div>
                  <div className="flex items-center justify-center" style={{ background: '#0b0f1a', aspectRatio: '16 / 10' }}>
                    {frame ? <img src={frame} alt="live browser" className="w-full h-full object-contain" />
                           : <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> starting browser…</div>}
                  </div>
                </div>
              )}

              {(running || shownSteps.length > 0) && (
                <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px #0000000a' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"><Link2 className="w-3.5 h-3.5" /> Live grounding</span>
                    {result && <span className="text-xs font-mono"><span className="text-emerald-600">{result.grounded} grounded</span><span className="text-gray-300"> · </span><span className={result.flagged ? 'text-amber-500' : 'text-gray-400'}>{result.flagged} flagged</span></span>}
                  </div>
                  <div className="space-y-1.5">
                    {shownSteps.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2" style={{ background: '#f9fafb', borderLeft: `3px solid ${s.status === 'grounded' ? '#10b981' : s.status === 'flagged' ? '#f59e0b' : '#d1d5db'}` }}>
                        <span className="mt-0.5">{dot(s.status)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-800">{s.raw}</div>
                          {s.locator && <div className="text-[11px] font-mono truncate text-indigo-600">{s.locator}</div>}
                          <div className={`text-[11px] ${s.status === 'flagged' ? 'text-amber-600' : 'text-gray-500'}`}>{s.detail}</div>
                        </div>
                      </div>
                    ))}
                    {running && <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> walking the app…</div>}
                  </div>
                </div>
              )}

              {result && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
                    <span className="text-xs font-mono text-gray-300">{(result.testName || 'autopilot').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.spec.ts</span>
                    <div className="flex items-center gap-2">
                      <button onClick={copy} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20"><Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy'}</button>
                      <button onClick={download} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20"><Download className="w-3 h-3" /> Download</button>
                    </div>
                  </div>
                  <pre className="text-xs p-4 overflow-auto font-mono leading-relaxed bg-gray-950 text-gray-100" style={{ maxHeight: '46vh' }}>{result.script}</pre>
                </div>
              )}

              {!running && shownSteps.length === 0 && !error && (
                <div className="bg-white rounded-xl border border-dashed p-12 text-center" style={{ borderColor: '#d1d5db' }}>
                  <Rocket className="w-9 h-9 mx-auto mb-3 text-indigo-300" />
                  <div className="text-sm text-gray-600">Add your manual steps and hit <span className="text-indigo-600 font-medium">Generate Playwright</span>.</div>
                  <div className="text-[11px] mt-1 text-gray-400">The agent drives the real app, verifies each selector by acting, and writes the script.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
