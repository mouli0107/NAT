/**
 * ASTRA Code Lens — in-process scheduler (Phase 4, time-based loop)
 *
 * A single in-process timer fires due schedules on a cadence and runs a review /
 * conform loop against the schedule's defined branch, then diffs the result vs the
 * previous run so only NEW violations raise an alert (scheduled runs are noisy
 * otherwise).
 *
 * Multi-instance safety: App Service can scale out, so every tick takes a
 * single-flight LOCK before doing work — only one instance/tick runs at a time.
 * An InMemoryLock is provided for single-instance dev; Phase 5 supplies a
 * DB-backed lock (Postgres advisory lock or a lock row with expires_at).
 *
 * All I/O is injected (SchedulerDeps) so the tick logic is unit-tested with fakes;
 * the DB-backed wiring + startup boot land in Phase 5.
 */

import type { CodeLensSession, LoopGoalPolicy, ViolationRecord } from './codelens-types';

// ─── Cadence + schedule model ──────────────────────────────────────────────────

export type Cadence =
  | { type: 'interval'; minutes: number }        // fire when elapsed since lastRun ≥ minutes
  | { type: 'dailyUtc'; hour: number; minute: number }; // fire once/day at/after HH:MM UTC

export interface ScheduleRecord {
  id: string;
  repoUrl: string;          // credential-free (auth resolved at run time)
  branch: string;
  mode: 'review' | 'conform';
  policy: LoopGoalPolicy;
  cadence: Cadence;
  enabled: boolean;
  lastRunAt: number | null; // epoch ms
  ownerUserId: string;
}

/** Never fire the same schedule more often than this, whatever the cadence says. */
export const MIN_INTERVAL_MS = 5 * 60 * 1000;

/** Is this schedule due to run at `now` (epoch ms)? Pure. */
export function isDue(s: ScheduleRecord, now: number): boolean {
  if (!s.enabled) return false;
  if (s.lastRunAt != null && now - s.lastRunAt < MIN_INTERVAL_MS) return false; // guard

  if (s.cadence.type === 'interval') {
    if (s.lastRunAt == null) return true;
    return now - s.lastRunAt >= s.cadence.minutes * 60_000;
  }
  // dailyUtc: due when we're at/after HH:MM today (UTC) and haven't run today.
  const d = new Date(now);
  const nowMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const targetMinutes = s.cadence.hour * 60 + s.cadence.minute;
  if (nowMinutes < targetMinutes) return false;
  if (s.lastRunAt == null) return true;
  return !isSameUtcDay(s.lastRunAt, now);
}

function isSameUtcDay(a: number, b: number): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getUTCFullYear() === db.getUTCFullYear()
    && da.getUTCMonth() === db.getUTCMonth()
    && da.getUTCDate() === db.getUTCDate();
}

// ─── Violation diffing (alert only on new) ─────────────────────────────────────

/** Stable cross-run key for a violation: path + rule + line. Independent of the
 *  in-memory fileId (which shifts if files are added/removed between runs). */
export function violationKey(relativePath: string, ruleId: string, lineStart: number): string {
  return `${relativePath.replace(/\\/g, '/')}::${ruleId}::${lineStart}`;
}

/** Collect stable violation keys from a finished session (open violations only). */
export function collectViolationKeys(session: CodeLensSession): string[] {
  const pathById = new Map(session.files.map(f => [f.fileId, f.relativePath]));
  const keys: string[] = [];
  for (const v of Array.from(session.violations.values()) as ViolationRecord[]) {
    if (v.status !== 'open') continue;
    keys.push(violationKey(pathById.get(v.fileId) ?? v.fileId, v.ruleId, v.lineStart));
  }
  return keys;
}

export interface ViolationDiff { added: string[]; removed: string[]; unchanged: string[] }

export function diffViolationKeys(previous: string[], current: string[]): ViolationDiff {
  const prev = new Set(previous);
  const cur = new Set(current);
  const added = current.filter(k => !prev.has(k));
  const removed = previous.filter(k => !cur.has(k));
  const unchanged = current.filter(k => prev.has(k));
  return { added, removed, unchanged };
}

// ─── Single-flight lock ────────────────────────────────────────────────────────

export interface SchedulerLock {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

/** Single-instance lock (dev / one App Service instance). Phase 5 → DB lock. */
export class InMemoryLock implements SchedulerLock {
  private held = new Map<string, number>(); // key → expiry epoch ms
  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const exp = this.held.get(key);
    if (exp != null && exp > now) return false;
    this.held.set(key, now + ttlMs);
    return true;
  }
  async release(key: string): Promise<void> { this.held.delete(key); }
}

// ─── Tick engine ────────────────────────────────────────────────────────────────

export interface ScheduleRunResult { violationKeys: string[] }

export interface SchedulerDeps {
  lock: SchedulerLock;
  /** Schedules currently due (implementation may pre-filter or return all + isDue). */
  getDueSchedules(now: number): Promise<ScheduleRecord[]>;
  /** Run the schedule (create session, run loop) and return its open-violation keys. */
  runSchedule(s: ScheduleRecord): Promise<ScheduleRunResult>;
  /** Previous run's violation keys for this schedule (for the diff). */
  loadPreviousKeys(scheduleId: string): Promise<string[]>;
  /** Persist this run: update lastRunAt + store current keys. */
  persistRun(scheduleId: string, ranAt: number, keys: string[]): Promise<void>;
  /** Fired only when NEW violations appear vs the previous run. */
  onNewViolations?(s: ScheduleRecord, added: string[]): void | Promise<void>;
}

export const LOCK_KEY = 'codelens-scheduler';
export const LOCK_TTL_MS = 10 * 60 * 1000;

export interface TickSummary {
  skipped?: 'locked';
  ran: Array<{ scheduleId: string; total: number; added: number; removed: number }>;
  errors: Array<{ scheduleId: string; message: string }>;
}

/** One scheduler pass. Lock-guarded; safe to call from multiple instances. */
export async function tick(deps: SchedulerDeps, now: number = Date.now()): Promise<TickSummary> {
  const got = await deps.lock.acquire(LOCK_KEY, LOCK_TTL_MS);
  if (!got) return { skipped: 'locked', ran: [], errors: [] };

  const ran: TickSummary['ran'] = [];
  const errors: TickSummary['errors'] = [];
  try {
    const due = await deps.getDueSchedules(now);
    for (const s of due) {
      try {
        const prev = await deps.loadPreviousKeys(s.id);
        const { violationKeys } = await deps.runSchedule(s);
        const diff = diffViolationKeys(prev, violationKeys);
        await deps.persistRun(s.id, now, violationKeys);
        if (diff.added.length > 0 && deps.onNewViolations) {
          await deps.onNewViolations(s, diff.added);
        }
        ran.push({ scheduleId: s.id, total: violationKeys.length, added: diff.added.length, removed: diff.removed.length });
      } catch (err: any) {
        errors.push({ scheduleId: s.id, message: err?.message ?? 'run failed' });
      }
    }
  } finally {
    await deps.lock.release(LOCK_KEY);
  }
  return { ran, errors };
}

/**
 * Start the periodic scheduler. Returns a stop() function. Overlapping ticks are
 * prevented by both the `running` flag and the single-flight lock.
 */
export function startCodeLensScheduler(deps: SchedulerDeps, tickEveryMs = 60_000): () => void {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await tick(deps); }
    catch (err: any) { console.error('[CodeLens][scheduler] tick error:', err?.message); }
    finally { running = false; }
  }, tickEveryMs);
  // Don't keep the process alive solely for the scheduler.
  if (typeof (timer as any).unref === 'function') (timer as any).unref();
  return () => clearInterval(timer);
}
