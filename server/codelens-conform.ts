/**
 * ASTRA Code Lens — Conform Mode (Phase 2)
 *
 * Review + REMEDIATE, driven as a goal-based loop. This is what the team's
 * Controller Conformance Kit does (fix toward the standard), layered on top of
 * our review engine (coverage ledger + confidence).
 *
 * Iteration model:
 *   iteration 1     → runReview(session)            (initial cold review)
 *   iteration 2..N  → remediate pass                (generate → screen → apply → verify)
 *
 * Each remediation candidate goes through the Accepted-Deviations FIX-SAFETY GATE
 * (screenFix). A fix that would INTRODUCE a banned pattern (MediatR, Polly,
 * in-process rate limiting, DbContext leak into Application) is NOT applied — the
 * violation is deferred for human review instead of "fixed" into a deviation.
 *
 * HONESTY: applyFix() marks a violation 'fixed' optimistically; we call
 * verifyFix() afterwards and only count it fixed if the standard actually passes
 * on the changed file. A fix that fails verification leaves the violation OPEN and
 * marks it CONTESTED (never retried) so the loop can't oscillate on it.
 *
 * SCOPE (v1): convergence is per-fix verify-and-freeze. A full cold RE-SWEEP after
 * remediation (to catch a fix that breaks a DIFFERENT file/standard) needs safe
 * re-review support in runReview (it currently does not reset violations across
 * runs) and is deferred to v2 — this module does not claim cross-file regression
 * convergence it hasn't performed.
 */

import { runReview, generateFix, applyFix, verifyFix } from './codelens-agent';
import { screenFix } from './codelens-authority';
import { computeMetric, goalMet, normalizeBudgets, type LoopBudgets, type LoopResult, type LoopIterationRecord } from './codelens-loop';
import { emit } from './codelens-session';
import type { CodeLensSession, LoopGoalPolicy, LoopStopReason, ViolationRecord } from './codelens-types';

export interface ConformConfig {
  policy: LoopGoalPolicy;
  budgets: LoopBudgets;
}

/** Max fixes attempted in a single remediation pass — keeps a pass bounded. */
const MAX_FIXES_PER_PASS = 25;

interface RemediateOutcome {
  attempted: number;
  fixed: number;
  deferred: number;
  failed: number;
}

/**
 * One remediation pass. Fixes open Critical/Warning violations that aren't
 * contested, gated by the authority fix-safety screen and honest verification.
 */
async function remediatePass(
  session: CodeLensSession,
  iteration: number,
  contested: Set<string>,
): Promise<RemediateOutcome> {
  const candidates = Array.from(session.violations.values())
    .filter((v: ViolationRecord) =>
      v.status === 'open' &&
      v.fixAvailable &&
      (v.severity === 'Critical' || v.severity === 'Warning') &&
      !contested.has(v.violationId))
    // Critical first — the goal cares about blockers.
    .sort((a, b) => (a.severity === 'Critical' ? 0 : 1) - (b.severity === 'Critical' ? 0 : 1))
    .slice(0, MAX_FIXES_PER_PASS);

  const outcome: RemediateOutcome = { attempted: 0, fixed: 0, deferred: 0, failed: 0 };

  for (const v of candidates) {
    outcome.attempted++;
    try {
      await generateFix(session, v.violationId);
      const fix = session.fixes.get(v.violationId);
      if (!fix) { outcome.failed++; continue; }

      // Fix-safety gate: reject fixes that would introduce an accepted-deviation
      // violation. Deferred (not applied) so we never "fix" into a deviation.
      const screen = screenFix(fix);
      emit(session, {
        event: 'fix_screened',
        session_id: session.sessionId,
        violation_id: v.violationId,
        allowed: screen.allowed,
        deviation_id: screen.deviationId,
        evidence: screen.evidence,
      });
      if (!screen.allowed) {
        v.status = 'deferred';
        contested.add(v.violationId); // don't regenerate it next pass
        outcome.deferred++;
        continue;
      }

      await applyFix(session, v.violationId);

      // Honest verification — only count as fixed if the standard actually passes.
      const verdict = await verifyFix(session, v.violationId);
      if (verdict.verified) {
        outcome.fixed++;
      } else {
        // Fix didn't hold — leave OPEN, mark contested so we don't loop on it.
        contested.add(v.violationId);
        outcome.failed++;
      }
    } catch (err: any) {
      console.warn(`[CodeLens][conform] fix failed for ${v.violationId}:`, err?.message);
      contested.add(v.violationId);
      outcome.failed++;
    }
  }

  emit(session, {
    event: 'conform_progress',
    session_id: session.sessionId,
    iteration,
    attempted: outcome.attempted,
    fixed: outcome.fixed,
    deferred: outcome.deferred,
    failed: outcome.failed,
  });

  return outcome;
}

/**
 * Run the goal-based Conform loop. Owns the run — callers invoke this instead of
 * runReview() when mode='conform'. Returns the same LoopResult shape as the
 * review loop so callers/telemetry are uniform.
 */
export async function runConformLoop(
  session: CodeLensSession,
  config: ConformConfig,
): Promise<LoopResult> {
  const budgets = normalizeBudgets(config.budgets);
  const policy = config.policy;
  const startedAt = Date.now();
  const iterations: LoopIterationRecord[] = [];
  const contested = new Set<string>();

  emit(session, {
    event: 'loop_started',
    session_id: session.sessionId,
    mode: 'conform',
    policy,
    budgets: {
      max_iterations: budgets.maxIterations,
      max_wall_clock_ms: budgets.maxWallClockMs,
      no_progress_iterations: budgets.noProgressIterations,
    },
  });

  let stopReason: LoopStopReason = 'max_iterations';
  let stalledFor = 0;

  try {
    for (let i = 1; i <= budgets.maxIterations; i++) {
      const iterStart = Date.now();
      const action: 'review' | 'remediate' = i === 1 ? 'review' : 'remediate';

      if (action === 'review') {
        await runReview(session);
      } else {
        const outcome = await remediatePass(session, i, contested);
        // No fix landed AND nothing new was deferred ⇒ no forward motion.
        if (outcome.fixed === 0) {
          stalledFor++;
        } else {
          stalledFor = 0;
        }
      }

      const metric = computeMetric(session);
      const met = goalMet(policy, metric);
      const elapsedMs = Date.now() - iterStart;
      iterations.push({ index: i, action, metric, goalMet: met, elapsedMs });
      emit(session, {
        event: 'loop_iteration',
        session_id: session.sessionId,
        iteration: i,
        action,
        metric,
        goal_met: met,
        elapsed_ms: elapsedMs,
      });

      if (met) { stopReason = 'goal_met'; break; }

      // After a remediation pass with no progress, or when every remaining
      // blocker is contested/deferred, stop rather than spin.
      if (action === 'remediate') {
        if (stalledFor >= budgets.noProgressIterations) { stopReason = 'no_progress'; break; }
        const remaining = Array.from(session.violations.values()).filter(
          v => v.status === 'open' && v.fixAvailable &&
               (v.severity === 'Critical' || v.severity === 'Warning') &&
               !contested.has(v.violationId));
        if (remaining.length === 0) {
          stopReason = goalMet(policy, computeMetric(session)) ? 'goal_met' : 'no_progress';
          break;
        }
      }

      if (Date.now() - startedAt >= budgets.maxWallClockMs) { stopReason = 'timeout'; break; }
    }
  } catch (err: any) {
    stopReason = 'error';
    emit(session, { event: 'error', message: err?.message ?? 'Conform loop error' });
  }

  const finalMetric = computeMetric(session);
  emit(session, {
    event: 'loop_complete',
    session_id: session.sessionId,
    stop_reason: stopReason,
    iterations: iterations.length,
    final_metric: finalMetric,
  });

  return { stopReason, iterations, finalMetric };
}
