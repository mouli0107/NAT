import type { LoopMetric } from './codeLensTypes';

export interface LoopIterationUi {
  index: number;
  action: 'review' | 'retry_coverage' | 'remediate';
  goalMet: boolean;
  elapsedMs: number;
  metric: LoopMetric;
}

export interface LoopUiState {
  mode: 'review' | 'conform';
  policy: string;
  maxIterations: number;
  iterations: LoopIterationUi[];
  stopReason: string | null;
  finalMetric: LoopMetric | null;
}

export interface ScreenedFix {
  violationId: string;
  deviationId: string | null;
  evidence: string;
}

const POLICY_LABEL: Record<string, string> = {
  full_coverage: 'Full coverage',
  zero_blocker: 'Zero blockers',
  zero_blocker_full_coverage: 'Zero blockers + full coverage',
};

const STOP_LABEL: Record<string, string> = {
  goal_met: 'Goal met', max_iterations: 'Max iterations', timeout: 'Timed out',
  no_progress: 'No further progress', oscillation: 'Oscillation guard', stopped: 'Stopped', error: 'Error',
};

const ACTION_LABEL: Record<string, string> = {
  review: 'Review', retry_coverage: 'Retry coverage', remediate: 'Remediate',
};

function metricLine(m: LoopMetric): string {
  return `${m.criticalOpen} critical · ${m.warningOpen} warning · ${m.infoOpen} info · ${m.confidencePct}% confidence · ${m.runStatus}`;
}

export function LoopPanel({
  loop, conformProgress, screenedFixes,
}: {
  loop: LoopUiState;
  conformProgress: { attempted: number; fixed: number; deferred: number; failed: number } | null;
  screenedFixes: ScreenedFix[];
}) {
  const done = loop.stopReason != null;
  const goalMet = loop.stopReason === 'goal_met';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" data-testid="loop-panel">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${loop.mode === 'conform' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
            {loop.mode === 'conform' ? 'Conform loop' : 'Review loop'}
          </span>
          <span className="text-xs text-slate-500">Goal: {POLICY_LABEL[loop.policy] ?? loop.policy}</span>
        </div>
        {done ? (
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${goalMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {STOP_LABEL[loop.stopReason!] ?? loop.stopReason}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            Iteration {loop.iterations.length} / {loop.maxIterations}
          </span>
        )}
      </div>

      {/* Final metric */}
      {loop.finalMetric && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-700">Final result</div>
          <div className="text-slate-600">{metricLine(loop.finalMetric)}</div>
        </div>
      )}

      {/* Conform remediation counters */}
      {conformProgress && (
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {([['Attempted', conformProgress.attempted, 'text-slate-700'],
             ['Fixed', conformProgress.fixed, 'text-emerald-600'],
             ['Deferred', conformProgress.deferred, 'text-amber-600'],
             ['Failed', conformProgress.failed, 'text-rose-600']] as const).map(([label, n, cls]) => (
            <div key={label} className="rounded-md border border-slate-200 py-2">
              <div className={`text-lg font-semibold ${cls}`}>{n}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Iteration timeline */}
      {loop.iterations.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {loop.iterations.map(it => (
            <li key={it.index} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                {it.index}
              </span>
              <div className="flex-1">
                <span className="font-medium text-slate-700">{ACTION_LABEL[it.action] ?? it.action}</span>
                {it.goalMet && <span className="ml-2 text-emerald-600">✓ goal met</span>}
                <div className="text-slate-500">{metricLine(it.metric)}</div>
              </div>
              <span className="text-slate-400">{(it.elapsedMs / 1000).toFixed(1)}s</span>
            </li>
          ))}
        </ol>
      )}

      {/* Fixes deferred by the Accepted-Deviations authority gate */}
      {screenedFixes.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">
            {screenedFixes.length} fix(es) deferred to preserve accepted deviations
          </div>
          <ul className="mt-1 space-y-1">
            {screenedFixes.slice(0, 8).map((s, i) => (
              <li key={i} className="text-[11px] text-amber-700">
                <span className="font-mono font-semibold">{s.deviationId ?? 'A?'}</span>
                {' · '}{s.violationId}
                {s.evidence && <span className="text-amber-600"> — would add <code>{s.evidence}</code></span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
