/**
 * ASTRA Code Lens — Loop Controller (Phase 1: goal-based review loop)
 *
 * Wraps a review run and iterates until a GOAL is reached or a BUDGET trips.
 * This is the generic control loop that Phase 2 (Conform/remediate) and Phase 4
 * (scheduler) both drive; Phase 1 wires only the review-only iteration.
 *
 * Review-only iteration model:
 *   iteration 1        → runReview(session)          (full cold sweep)
 *   iteration 2..N     → retryCoverage(session)      (re-check unverified cells)
 *
 * That converges the fail-closed coverage ledger: keep retrying the cells that
 * could not be verified until the ledger is COMPLETE, the metric stops improving
 * (no_progress), or a budget is exhausted. Phase 2 inserts a 'remediate' action
 * (apply fixes → re-review) between reviews for goals that need code changes.
 *
 * IMPORTANT: completeness is read from the coverage LEDGER, never session.status
 * — finalizeRun() collapses a PARTIAL run into session.status='stopped', so
 * trusting session.status here would misreport a partially-covered run.
 */

import { runReview, retryCoverage } from './codelens-agent';
import { emit } from './codelens-session';
import type {
  CodeLensSession,
  LoopGoalPolicy,
  LoopMetric,
  LoopStopReason,
  ViolationRecord,
} from './codelens-types';

export interface LoopBudgets {
  /** Hard cap on iterations (including the initial review). */
  maxIterations: number;
  /** Wall-clock ceiling across the whole loop. */
  maxWallClockMs: number;
  /** Stop if the target metric fails to improve for this many consecutive iterations. */
  noProgressIterations: number;
}

export interface LoopConfig {
  policy: LoopGoalPolicy;
  budgets: LoopBudgets;
}

export interface LoopIterationRecord {
  index: number;
  action: 'review' | 'retry_coverage' | 'remediate';
  metric: LoopMetric;
  goalMet: boolean;
  elapsedMs: number;
}

export interface LoopResult {
  stopReason: LoopStopReason;
  iterations: LoopIterationRecord[];
  finalMetric: LoopMetric;
}

/** Sensible defaults — review-only loops converge in 1–3 iterations in practice. */
export const DEFAULT_LOOP_BUDGETS: LoopBudgets = {
  maxIterations: 5,
  maxWallClockMs: 20 * 60 * 1000, // 20 min
  noProgressIterations: 2,
};

/** Clamp caller-supplied budgets into safe bounds (never allow an unbounded loop). */
export function normalizeBudgets(partial?: Partial<LoopBudgets>): LoopBudgets {
  const b = { ...DEFAULT_LOOP_BUDGETS, ...(partial ?? {}) };
  return {
    maxIterations: Math.min(Math.max(1, Math.floor(b.maxIterations)), 20),
    maxWallClockMs: Math.min(Math.max(60_000, b.maxWallClockMs), 60 * 60 * 1000),
    noProgressIterations: Math.min(Math.max(1, Math.floor(b.noProgressIterations)), 10),
  };
}

/**
 * Read-only ledger snapshot. Completeness comes from the coverage ledger
 * (errorCells + verified/expected), independent of session.status.
 */
export function computeMetric(session: CodeLensSession): LoopMetric {
  const open = Array.from(session.violations.values()).filter(
    (v: ViolationRecord) => v.status === 'open',
  );
  const criticalOpen = open.filter(v => v.severity === 'Critical').length;
  const warningOpen = open.filter(v => v.severity === 'Warning').length;
  const infoOpen = open.filter(v => v.severity === 'Info').length;

  const errorCells = session.coverageErrors.size;
  const complete =
    session.coverageExpected > 0 &&
    errorCells === 0 &&
    session.coverageVerified >= session.coverageExpected;

  let applicable = 0;
  let verified = 0;
  for (const s of Array.from(session.fileSummaries.values())) {
    applicable += s.applicableCells;
    verified += s.verifiedCells;
  }
  const confidencePct = applicable > 0 ? Math.round((verified / applicable) * 100) : 100;

  return {
    runStatus: complete ? 'COMPLETE' : 'PARTIAL',
    criticalOpen,
    warningOpen,
    infoOpen,
    openViolations: open.length,
    errorCells,
    confidencePct,
  };
}

/** Has the configured goal been reached for this metric? */
export function goalMet(policy: LoopGoalPolicy, m: LoopMetric): boolean {
  switch (policy) {
    case 'full_coverage':
      return m.runStatus === 'COMPLETE';
    case 'zero_blocker':
      return m.criticalOpen === 0;
    case 'zero_blocker_full_coverage':
      return m.runStatus === 'COMPLETE' && m.criticalOpen === 0;
    default:
      return false;
  }
}

/**
 * The scalar the no-progress detector watches, per policy. Lower is better; the
 * loop stops if this value fails to strictly decrease for `noProgressIterations`.
 */
function progressMetric(policy: LoopGoalPolicy, m: LoopMetric): number {
  switch (policy) {
    case 'full_coverage':
      return m.errorCells;
    case 'zero_blocker':
      return m.criticalOpen;
    case 'zero_blocker_full_coverage':
      return m.errorCells + m.criticalOpen;
    default:
      return m.errorCells;
  }
}

/**
 * Run the goal-based review loop. The loop OWNS the run — callers invoke this
 * instead of runReview() directly when loop mode is requested.
 *
 * Phase 1 note: 'zero_blocker' goals can only be *reached* once Phase 2
 * remediation is wired (review-only cannot lower the blocker count). Until then
 * such a goal will legitimately stop on no_progress/max_iterations with the open
 * blockers reported — which is honest, not a failure.
 */
export async function runReviewLoop(
  session: CodeLensSession,
  config: LoopConfig,
): Promise<LoopResult> {
  const budgets = normalizeBudgets(config.budgets);
  const policy = config.policy;
  const startedAt = Date.now();
  const iterations: LoopIterationRecord[] = [];

  emit(session, {
    event: 'loop_started',
    session_id: session.sessionId,
    mode: 'review',
    policy,
    budgets: {
      max_iterations: budgets.maxIterations,
      max_wall_clock_ms: budgets.maxWallClockMs,
      no_progress_iterations: budgets.noProgressIterations,
    },
  });

  let stopReason: LoopStopReason = 'max_iterations';
  let bestProgress = Number.POSITIVE_INFINITY;
  let stalledFor = 0;
  let metric: LoopMetric = computeMetric(session);

  try {
    for (let i = 1; i <= budgets.maxIterations; i++) {
      const iterStart = Date.now();
      const action: 'review' | 'retry_coverage' = i === 1 ? 'review' : 'retry_coverage';

      if (action === 'review') {
        await runReview(session);
      } else {
        // Nothing left to retry ⇒ review-only loop cannot make further progress.
        if (session.coverageErrors.size === 0) {
          metric = computeMetric(session);
          stopReason = goalMet(policy, metric) ? 'goal_met' : 'no_progress';
          recordIteration(session, iterations, i, action, metric, policy, iterStart);
          break;
        }
        await retryCoverage(session);
      }

      metric = computeMetric(session);
      const met = goalMet(policy, metric);
      recordIteration(session, iterations, i, action, metric, policy, iterStart);

      if (met) {
        stopReason = 'goal_met';
        break;
      }

      // No-progress detection on the policy's target scalar.
      const p = progressMetric(policy, metric);
      if (p < bestProgress) {
        bestProgress = p;
        stalledFor = 0;
      } else {
        stalledFor++;
        if (stalledFor >= budgets.noProgressIterations) {
          stopReason = 'no_progress';
          break;
        }
      }

      // Wall-clock budget.
      if (Date.now() - startedAt >= budgets.maxWallClockMs) {
        stopReason = 'timeout';
        break;
      }
    }
  } catch (err: any) {
    stopReason = 'error';
    emit(session, { event: 'error', message: err?.message ?? 'Loop controller error' });
  }

  metric = computeMetric(session);
  emit(session, {
    event: 'loop_complete',
    session_id: session.sessionId,
    stop_reason: stopReason,
    iterations: iterations.length,
    final_metric: metric,
  });

  return { stopReason, iterations, finalMetric: metric };
}

function recordIteration(
  session: CodeLensSession,
  iterations: LoopIterationRecord[],
  index: number,
  action: 'review' | 'retry_coverage',
  metric: LoopMetric,
  policy: LoopGoalPolicy,
  iterStart: number,
): void {
  const elapsedMs = Date.now() - iterStart;
  const met = goalMet(policy, metric);
  iterations.push({ index, action, metric, goalMet: met, elapsedMs });
  emit(session, {
    event: 'loop_iteration',
    session_id: session.sessionId,
    iteration: index,
    action,
    metric,
    goal_met: met,
    elapsed_ms: elapsedMs,
  });
}
