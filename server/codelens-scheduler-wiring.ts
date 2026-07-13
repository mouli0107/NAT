/**
 * ASTRA Code Lens — scheduler wiring (Phase 5).
 *
 * Binds the pure scheduler engine (codelens-scheduler) to DB-backed providers
 * (codelens-loop-db) and the review/conform loops, then boots the periodic timer.
 *
 * This module top-level-imports codelens-loop-db (→ ./db, which throws without
 * DATABASE_URL), so it MUST only be dynamically imported after a DATABASE_URL
 * guard — see bootCodeLensScheduler() and its caller in index.ts.
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { createSession } from './codelens-session';
import { runReviewLoop, normalizeBudgets } from './codelens-loop';
import { runConformLoop } from './codelens-conform';
import { buildAuthenticatedUrl } from './codelens-agent';
import {
  isDue, startCodeLensScheduler, collectViolationKeys,
  type SchedulerDeps, type ScheduleRecord,
} from './codelens-scheduler';
import {
  listEnabledSchedules, loadScheduleKeys, recordScheduleRun, recordLoopRun, DbSchedulerLock,
} from './codelens-loop-db';
import type { LoopGoalPolicy } from './codelens-types';

async function runSchedule(s: ScheduleRecord): Promise<{ violationKeys: string[] }> {
  const sessionId = `cls-sch-${randomUUID().slice(0, 8)}`;
  const localPath = path.join(os.tmpdir(), 'codelens', sessionId);
  fs.mkdirSync(localPath, { recursive: true });

  // Scheduled runs authenticate via a service PAT (public repos work without it).
  const authUrl = buildAuthenticatedUrl(s.repoUrl, process.env.CODELENS_SCHEDULE_PAT?.trim() ?? '');
  const session = createSession(sessionId, authUrl, s.branch, localPath, [], [], s.ownerUserId);

  const budgets = normalizeBudgets();
  const result = s.mode === 'conform'
    ? await runConformLoop(session, { policy: s.policy as LoopGoalPolicy, budgets })
    : await runReviewLoop(session, { policy: s.policy as LoopGoalPolicy, budgets });

  const violationKeys = collectViolationKeys(session);
  await recordLoopRun({
    sessionId, userId: s.ownerUserId, mode: s.mode, policy: s.policy,
    iterations: result.iterations.length, stopReason: result.stopReason, finalMetric: result.finalMetric,
  }).catch(() => {});
  return { violationKeys };
}

export function makeSchedulerDeps(): SchedulerDeps {
  return {
    lock: new DbSchedulerLock(),
    getDueSchedules: async (now) => (await listEnabledSchedules()).filter(s => isDue(s, now)),
    runSchedule,
    loadPreviousKeys: (id) => loadScheduleKeys(id),
    persistRun: (id, ranAt, keys) => recordScheduleRun(id, ranAt, keys),
    onNewViolations: (s, added) =>
      console.log(`[CodeLens][scheduler] ${added.length} NEW violation(s) on ${s.repoUrl}@${s.branch}`),
  };
}

/** Start the scheduler. No-op (returns null) unless explicitly enabled + DB present. */
export function bootCodeLensScheduler(): (() => void) | null {
  const enabled = /^(1|true|yes|on)$/i.test(process.env.CODELENS_SCHEDULER_ENABLED?.trim() ?? '');
  if (!enabled || !process.env.DATABASE_URL) return null;
  console.log('[CodeLens][scheduler] starting in-process scheduler');
  return startCodeLensScheduler(makeSchedulerDeps());
}
