/**
 * AgentOrchestrationView — Light theme
 *
 * Premium white + vivid-color design:
 *  • Blue gradient orchestrator header
 *  • White pipeline card with colored spinning rings
 *  • White log panel with colored agent labels
 *  • White preview panel with pink accented records
 */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, XCircle, FileText, Database,
  Code2, ShieldCheck, Sparkles, Brain, Loader2,
} from "lucide-react";

// ─── Agent config ─────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id:       "parsing",
    label:    "Parsing",
    fullName: "Parsing Agent",
    Icon:     FileText,
    ring:     "#3b82f6",          // blue-500
    light:    "#eff6ff",          // blue-50
    mid:      "#93c5fd",          // blue-300
    text:     "#1d4ed8",          // blue-700
    glow:     "rgba(59,130,246,0.22)",
  },
  {
    id:       "schema",
    label:    "Schema",
    fullName: "Schema Agent",
    Icon:     Database,
    ring:     "#8b5cf6",          // violet-500
    light:    "#f5f3ff",          // violet-50
    mid:      "#c4b5fd",          // violet-300
    text:     "#6d28d9",          // violet-700
    glow:     "rgba(139,92,246,0.22)",
  },
  {
    id:       "regex",
    label:    "Regex",
    fullName: "Regex Agent",
    Icon:     Code2,
    ring:     "#f59e0b",          // amber-500
    light:    "#fffbeb",          // amber-50
    mid:      "#fcd34d",          // amber-300
    text:     "#b45309",          // amber-700
    glow:     "rgba(245,158,11,0.22)",
  },
  {
    id:       "validation",
    label:    "Validate",
    fullName: "Validation Agent",
    Icon:     ShieldCheck,
    ring:     "#10b981",          // emerald-500
    light:    "#ecfdf5",          // emerald-50
    mid:      "#6ee7b7",          // emerald-300
    text:     "#065f46",          // emerald-700
    glow:     "rgba(16,185,129,0.22)",
  },
  {
    id:       "generation",
    label:    "Generate",
    fullName: "Generation Agent",
    Icon:     Sparkles,
    ring:     "#ec4899",          // pink-500
    light:    "#fdf2f8",          // pink-50
    mid:      "#f9a8d4",          // pink-300
    text:     "#be185d",          // pink-700
    glow:     "rgba(236,72,153,0.22)",
  },
] as const;

type AgentId = typeof AGENTS[number]["id"] | "orchestrator";
type AgentStatus = "idle" | "running" | "complete" | "error";

interface AgentState {
  status:      AgentStatus;
  currentTask: string;
  progress:    number;
}

interface LogEntry {
  ts:      number;
  agentId: string;
  message: string;
  type:    string;
}

interface PreviewRecord {
  recordNumber: number;
  lines:        string[];
}

interface AgentEvent {
  type:      string;
  agentId:   string;
  message:   string;
  progress?: number;
  data?:     any;
  timestamp: number;
}

interface Props {
  fileId:     string;
  filename:   string;
  onComplete: (schema: any, regexMap: Record<string, string>) => void;
  onError:    (msg: string) => void;
}

// ─── AgentPod ─────────────────────────────────────────────────────────────────

function AgentPod({ agentId, state }: { agentId: string; state: AgentState }) {
  const def = AGENTS.find(a => a.id === agentId);
  if (!def) return null;
  const { Icon, ring, light, mid, text, glow } = def;
  const running  = state.status === "running";
  const complete = state.status === "complete";
  const errored  = state.status === "error";
  const pct      = Math.round(state.progress * 100);

  return (
    // Fixed height so the pipeline row never shifts when task text / progress bar appear
    <div className="flex flex-col items-center gap-2" style={{ minWidth: 100, width: 110, height: 192 }}>

      {/* ── Circle ── */}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>

        {/* Bloom glow behind circle */}
        {running && (
          <div className="absolute rounded-full" style={{
            inset: -10,
            background: glow,
            filter: "blur(14px)",
            animation: "breathe 2s ease-in-out infinite",
          }} />
        )}
        {complete && (
          <div className="absolute rounded-full" style={{
            inset: -4,
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          }} />
        )}

        {/* Spinning outer ring (running only) */}
        {running && (
          <div className="absolute rounded-full" style={{
            inset: -5,
            background: `conic-gradient(from 0deg, transparent 0%, ${ring} 35%, ${mid} 50%, transparent 65%)`,
            animation: "spin 1.5s linear infinite",
          }} />
        )}

        {/* Dashed idle ring */}
        {!running && !complete && !errored && (
          <div className="absolute rounded-full" style={{
            inset: 0,
            border: `2px dashed #e2e8f0`,
          }} />
        )}

        {/* Solid completed ring */}
        {complete && (
          <div className="absolute rounded-full" style={{
            inset: 0,
            border: `2.5px solid ${ring}`,
            boxShadow: `0 0 0 3px ${glow}`,
          }} />
        )}

        {/* Inner filled circle */}
        <div className="relative z-10 flex items-center justify-center rounded-full" style={{
          width:      68,
          height:     68,
          background: running || complete ? light : "#f8fafc",
          border:     running  ? `2px solid ${ring}40`
                    : complete ? "none"
                    : "2px solid #e2e8f0",
          boxShadow:  running  ? `inset 0 2px 8px ${glow}, 0 4px 16px ${glow}`
                    : complete ? `0 4px 12px ${glow}`
                    : "none",
          transition: "all 0.4s",
        }}>
          {complete ? (
            <CheckCircle2 style={{ width: 30, height: 30, color: ring }} />
          ) : errored ? (
            <XCircle style={{ width: 30, height: 30, color: "#ef4444" }} />
          ) : (
            <Icon style={{
              width:     28,
              height:    28,
              color:     running ? ring : "#94a3b8",
              transition: "color 0.3s",
              animation: running ? "pulse 1.8s ease-in-out infinite" : "none",
            }} />
          )}
        </div>
      </div>

      {/* ── Name ── */}
      <span className="text-xs font-bold text-center" style={{
        color:      running || complete ? text : "#94a3b8",
        letterSpacing: "0.02em",
        transition: "color 0.3s",
      }}>
        {def.fullName}
      </span>

      {/* ── Status pill ── */}
      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={
        complete ? {
          background: light,
          color:      text,
          border:     `1px solid ${mid}`,
        } : running ? {
          background: light,
          color:      text,
          border:     `1px solid ${ring}`,
          animation:  "pulse 1.5s ease-in-out infinite",
        } : errored ? {
          background: "#fef2f2",
          color:      "#dc2626",
          border:     "1px solid #fca5a5",
        } : {
          background: "#f8fafc",
          color:      "#94a3b8",
          border:     "1px solid #e2e8f0",
        }
      }>
        {complete ? "✓ Done" : errored ? "✗ Error" : running ? "● Active" : "○ Idle"}
      </span>

      {/* ── Progress bar — always rendered, invisible when idle ── */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "#e2e8f0" }}>
        <div className="h-full rounded-full" style={{
          width:      (running || complete) ? `${pct}%` : "0%",
          background: `linear-gradient(90deg, ${mid}, ${ring})`,
          transition: "width 0.45s ease-out",
          boxShadow:  running ? `0 0 6px ${glow}` : "none",
        }} />
      </div>

      {/* ── Current task text — always reserves its two-line height ── */}
      <p className="text-[10px] text-center leading-snug px-1"
         style={{ color: "#64748b", maxWidth: 100, height: 28, overflow: "hidden",
                  opacity: running ? 1 : 0, transition: "opacity 0.25s" }}>
        {state.currentTask.length > 55
          ? state.currentTask.slice(0, 55) + "…"
          : state.currentTask}
      </p>
    </div>
  );
}

/** Animated connector between two pods — fixed height matches pod height */
function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex items-center flex-shrink-0" style={{ width: 48, height: 192, paddingBottom: 80 }}>
      <div className="flex-1 rounded-full" style={{
        height:     2,
        background: active
          ? "linear-gradient(90deg, #10b981, #3b82f6)"
          : "#e2e8f0",
        transition: "background 0.6s",
        boxShadow:  active ? "0 0 6px rgba(59,130,246,0.4)" : "none",
      }} />
      <div style={{
        fontSize: 11,
        color:    active ? "#3b82f6" : "#cbd5e1",
        transition: "color 0.6s",
        marginLeft: 1,
      }}>▶</div>
    </div>
  );
}

/** Single log row */
function LogRow({ entry }: { entry: LogEntry }) {
  const def = AGENTS.find(a => a.id === entry.agentId);
  const time = new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false });
  const isComplete = entry.type === "agent_complete";
  const isError    = entry.type === "agent_error";
  const isOrch     = entry.agentId === "orchestrator";

  return (
    <div className="flex gap-2 items-start text-[11px] font-mono leading-relaxed py-0.5 border-b last:border-0" style={{ borderColor: "#f1f5f9" }}>
      <span className="flex-shrink-0 w-14" style={{ color: "#94a3b8" }}>{time}</span>
      <span className="font-bold flex-shrink-0 w-[72px] overflow-hidden whitespace-nowrap" style={{
        color: isOrch ? "#8b5cf6" : (def?.ring ?? "#3b82f6"),
        textOverflow: "ellipsis",
      }}>
        [{isOrch ? "Orch" : def?.label ?? entry.agentId}]
      </span>
      <span className="flex-1 leading-relaxed" style={{
        color: isComplete ? "#059669"
             : isError    ? "#dc2626"
             : isOrch     ? "#7c3aed"
             : "#374151",
        fontWeight: isComplete ? 600 : 400,
      }}>
        {entry.message}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentOrchestrationView({ fileId, filename, onComplete, onError }: Props) {
  const initAgents = (): Record<string, AgentState> =>
    Object.fromEntries(AGENTS.map(a => [a.id, { status: "idle" as AgentStatus, currentTask: "Waiting…", progress: 0 }]));

  const [agents,         setAgents]        = useState<Record<string, AgentState>>(initAgents());
  const [orchMessage,    setOrchMessage]    = useState("Initialising NAT agent pipeline…");
  const [logEntries,     setLogEntries]     = useState<LogEntry[]>([]);
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([]);
  const [pipelineDone,   setPipelineDone]   = useState(false);

  const finalSchemaRef = useRef<any>(null);
  const finalRegexRef  = useRef<Record<string, string>>({});
  const logEndRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEntries]);

  useEffect(() => {
    const url = `/api/synthetic-data/orchestrate-stream?fileId=${encodeURIComponent(fileId)}&filename=${encodeURIComponent(filename)}`;
    const es  = new EventSource(url);

    es.onmessage = (evt: MessageEvent) => {
      let event: AgentEvent;
      try { event = JSON.parse(evt.data); } catch { return; }

      if (!["final_schema", "done", "preview_record"].includes(event.type)) {
        setLogEntries(prev => [...prev, {
          ts: event.timestamp, agentId: event.agentId,
          message: event.message, type: event.type,
        }]);
      }

      switch (event.type) {
        case "orchestrator_message":
          setOrchMessage(event.message);
          break;
        case "agent_start":
          setAgents(prev => ({ ...prev, [event.agentId]: { status: "running", currentTask: "Starting…", progress: 0 } }));
          break;
        case "agent_task":
          setAgents(prev => {
            const cur = prev[event.agentId];
            if (!cur) return prev;
            return { ...prev, [event.agentId]: { ...cur, currentTask: event.message, progress: event.progress ?? cur.progress } };
          });
          break;
        case "agent_complete":
          setAgents(prev => ({ ...prev, [event.agentId]: { status: "complete", currentTask: event.message, progress: 1 } }));
          break;
        case "agent_error":
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], status: "error", currentTask: event.message } }));
          break;
        case "preview_record":
          if (event.data?.lines) {
            setPreviewRecords(prev => [...prev, { recordNumber: event.data.recordNumber, lines: event.data.lines }]);
          }
          break;
        case "final_schema":
          if (event.data?.schema) {
            finalSchemaRef.current = event.data.schema;
            finalRegexRef.current  = event.data.regexMap || {};
          }
          break;
        case "done":
          setPipelineDone(true);
          setOrchMessage("✓ All 5 agents completed. Handing off to schema editor…");
          es.close();
          setTimeout(() => {
            if (finalSchemaRef.current) {
              onComplete(finalSchemaRef.current, finalRegexRef.current);
            } else {
              onError("Orchestration completed but schema was not received. Please try again.");
            }
          }, 1800);
          break;
      }
    };

    es.onerror = () => {
      es.close();
      onError("Connection to agent orchestrator was lost. Please try again.");
    };

    return () => es.close();
  }, [fileId, filename, onComplete, onError]);

  const doneCount = AGENTS.filter(a => agents[a.id]?.status === "complete").length;
  const activeAgent = AGENTS.find(a => agents[a.id]?.status === "running");

  return (
    <>
      <style>{`
        @keyframes spin    { from { transform: rotate(0deg);   } to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
        @keyframes breathe { 0%,100% { transform:scale(1); opacity:0.8; } 50% { transform:scale(1.18); opacity:1; } }
        @keyframes slidein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
      `}</style>

      <div className="space-y-4">

        {/* ── Orchestrator header — blue gradient ── */}
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{
          background: "linear-gradient(135deg, #1e40af 0%, #4f46e5 50%, #7c3aed 100%)",
        }}>
          <div className="px-5 py-4 flex items-start gap-4">

            {/* Brain orb */}
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center rounded-full" style={{
                width: 52, height: 52,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,0.25)",
              }}>
                <Brain style={{ width: 26, height: 26, color: "#fff" }} />
              </div>
              {!pipelineDone && (
                <div className="absolute rounded-full" style={{
                  width: 13, height: 13, top: -2, right: -2,
                  background: "#4ade80",
                  border: "2px solid #1e40af",
                  animation: "pulse 1.4s ease-in-out infinite",
                }} />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-base font-bold text-white tracking-tight">NAT Agent Orchestrator</span>
                {pipelineDone ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{
                    background: "rgba(74,222,128,0.25)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)",
                  }}>✓ Complete</span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{
                    background: "rgba(255,255,255,0.15)", color: "#e0e7ff",
                    border: "1px solid rgba(255,255,255,0.25)",
                    animation: "pulse 2s ease-in-out infinite",
                  }}>
                    ● Running — {doneCount} of 5 agents done
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{filename}</p>
              <p className="text-sm mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
                {orchMessage}
              </p>
            </div>

            {/* Overall progress dots */}
            <div className="flex-shrink-0 flex items-center gap-1.5 mt-1">
              {AGENTS.map(a => (
                <div key={a.id} className="rounded-full transition-all duration-500" style={{
                  width:      agents[a.id]?.status === "running" ? 10 : 8,
                  height:     agents[a.id]?.status === "running" ? 10 : 8,
                  background: agents[a.id]?.status === "complete" ? a.ring
                            : agents[a.id]?.status === "running"  ? "#fff"
                            : "rgba(255,255,255,0.25)",
                  boxShadow:  agents[a.id]?.status === "running"  ? `0 0 8px #fff` : "none",
                  animation:  agents[a.id]?.status === "running"  ? "pulse 1.2s ease-in-out infinite" : "none",
                }} />
              ))}
            </div>
          </div>

          {/* Thin animated progress stripe at bottom */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.1)" }}>
            <div style={{
              height: "100%",
              width:  `${(doneCount / 5) * 100}%`,
              background: "linear-gradient(90deg, #4ade80, #60a5fa)",
              transition: "width 0.6s ease-out",
              boxShadow: "0 0 8px rgba(96,165,250,0.8)",
            }} />
          </div>
        </div>

        {/* ── Agent pipeline — white card ── */}
        <div className="rounded-2xl bg-white shadow-md border border-slate-100 px-6 py-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg,#3b82f6,#8b5cf6)" }} />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Agent Pipeline</p>
          </div>

          <div className="flex items-start justify-between">
            {AGENTS.map((a, idx) => (
              <div key={a.id} className="flex items-center">
                <AgentPod
                  agentId={a.id}
                  state={agents[a.id] ?? { status: "idle", currentTask: "", progress: 0 }}
                />
                {idx < AGENTS.length - 1 && (
                  <Connector active={agents[a.id]?.status === "complete"} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Log + Preview side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Live log — white */}
          <div className="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <div className="w-2 h-2 rounded-full" style={{
                background: pipelineDone ? "#4ade80" : "#3b82f6",
                animation:  pipelineDone ? "none" : "pulse 1.4s ease-in-out infinite",
                boxShadow:  pipelineDone ? "0 0 6px #4ade80" : "0 0 6px #3b82f6",
              }} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Agent Log</span>
              <span className="ml-auto text-xs font-medium text-slate-300">{logEntries.length} events</span>
            </div>

            <div className="overflow-y-auto px-3 py-2" style={{ height: 280, background: "#fafbfc" }}>
              {logEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                  <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                  <span className="text-xs">Waiting for agents…</span>
                </div>
              ) : (
                logEntries.map((entry, idx) => <LogRow key={idx} entry={entry} />)
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Preview records — white */}
          <div className="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
              <Sparkles style={{ width: 13, height: 13, color: "#ec4899" }} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Preview Records</span>
              {previewRecords.length > 0 && (
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                  background: "#fdf2f8", color: "#be185d", border: "1px solid #fbcfe8",
                }}>
                  {previewRecords.length} generated
                </span>
              )}
            </div>

            <div className="overflow-y-auto p-3 space-y-2.5" style={{ height: 280, background: "#fafbfc" }}>
              {previewRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
                  <Sparkles style={{ width: 36, height: 36, opacity: 0.3 }} />
                  <p className="text-xs text-center text-slate-400">
                    Preview records will appear<br />during the Generation Agent step
                  </p>
                </div>
              ) : (
                previewRecords.map((rec, idx) => {
                  const colors = [
                    { bg: "#eff6ff", border: "#bfdbfe", label: "#1d4ed8" },   // blue
                    { bg: "#f5f3ff", border: "#ddd6fe", label: "#6d28d9" },   // violet
                    { bg: "#ecfdf5", border: "#a7f3d0", label: "#065f46" },   // green
                    { bg: "#fffbeb", border: "#fde68a", label: "#92400e" },   // amber
                    { bg: "#fdf2f8", border: "#fbcfe8", label: "#be185d" },   // pink
                  ];
                  const c = colors[idx % colors.length];
                  return (
                    <div key={rec.recordNumber} className="rounded-xl p-3"
                         style={{ background: c.bg, border: `1px solid ${c.border}`, animation: "slidein 0.3s ease-out" }}>
                      <div className="text-[10px] font-bold mb-1.5" style={{ color: c.label }}>
                        Record #{rec.recordNumber}
                      </div>
                      {rec.lines.map((line, li) => (
                        <div key={li} className="font-mono break-all leading-relaxed"
                             style={{ fontSize: 10, color: "#64748b" }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Completion banner ── */}
        {pipelineDone && (
          <div className="rounded-2xl px-5 py-4 flex items-center gap-4 shadow-md"
               style={{
                 background: "linear-gradient(135deg, #ecfdf5, #eff6ff)",
                 border: "1px solid #a7f3d0",
                 animation: "slidein 0.4s ease-out",
               }}>
            <div className="flex-shrink-0 rounded-full flex items-center justify-center"
                 style={{ width: 40, height: 40, background: "#d1fae5", border: "2px solid #6ee7b7" }}>
              <CheckCircle2 style={{ width: 22, height: 22, color: "#059669" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-700">All 5 agents completed successfully</p>
              <p className="text-xs text-slate-500 mt-0.5">Transitioning to schema editor…</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Loader2 style={{ width: 16, height: 16, color: "#10b981", animation: "spin 1s linear infinite" }} />
              <span className="text-xs font-medium text-emerald-600">Opening schema editor</span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
