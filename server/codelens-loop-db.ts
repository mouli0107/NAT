/**
 * ASTRA Code Lens — DB access for Phase 5 tables (drizzle).
 * Schedules, loop-run records, PR policies, contested findings, scheduler lock.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from './db';
import {
  codelensSchedules, codelensLoopRuns, codelensPrPolicies,
  codelensContestedFindings, codelensSchedulerLocks,
} from '@shared/schema';
import type { Cadence, ScheduleRecord, SchedulerLock } from './codelens-scheduler';
import type { PrPolicy, PrRunMode, PrPushMode } from './codelens-pr-policy';
import type { LoopGoalPolicy } from './codelens-types';

// ─── Schedules ──────────────────────────────────────────────────────────────

function rowToCadence(row: typeof codelensSchedules.$inferSelect): Cadence {
  return row.cadenceType === 'dailyUtc'
    ? { type: 'dailyUtc', hour: row.dailyHour ?? 0, minute: row.dailyMinute ?? 0 }
    : { type: 'interval', minutes: row.intervalMinutes ?? 1440 };
}

export function rowToScheduleRecord(row: typeof codelensSchedules.$inferSelect): ScheduleRecord {
  return {
    id: row.id,
    repoUrl: row.repoUrl,
    branch: row.branch,
    mode: (row.mode === 'conform' ? 'conform' : 'review'),
    policy: row.policy as LoopGoalPolicy,
    cadence: rowToCadence(row),
    enabled: row.enabled,
    lastRunAt: row.lastRunAt ? row.lastRunAt.getTime() : null,
    ownerUserId: row.userId ?? 'anonymous',
  };
}

export async function listEnabledSchedules(): Promise<ScheduleRecord[]> {
  const rows = await db.select().from(codelensSchedules).where(eq(codelensSchedules.enabled, true));
  return rows.map(rowToScheduleRecord);
}

export async function listSchedules(userId: string): Promise<ScheduleRecord[]> {
  const rows = await db.select().from(codelensSchedules).where(eq(codelensSchedules.userId, userId));
  return rows.map(rowToScheduleRecord);
}

export async function createSchedule(input: {
  userId: string; repoUrl: string; branch: string;
  mode: 'review' | 'conform'; policy: LoopGoalPolicy; cadence: Cadence; enabled?: boolean;
}): Promise<string> {
  const cadenceCols = input.cadence.type === 'dailyUtc'
    ? { cadenceType: 'dailyUtc', dailyHour: input.cadence.hour, dailyMinute: input.cadence.minute }
    : { cadenceType: 'interval', intervalMinutes: input.cadence.minutes };
  const rows = await db.insert(codelensSchedules).values({
    userId: input.userId, repoUrl: input.repoUrl, branch: input.branch,
    mode: input.mode, policy: input.policy, enabled: input.enabled ?? true,
    ...cadenceCols,
  }).returning({ id: codelensSchedules.id });
  return rows[0].id;
}

export async function setScheduleEnabled(id: string, enabled: boolean): Promise<void> {
  await db.update(codelensSchedules).set({ enabled, updatedAt: new Date() }).where(eq(codelensSchedules.id, id));
}

export async function deleteSchedule(id: string): Promise<void> {
  await db.delete(codelensSchedules).where(eq(codelensSchedules.id, id));
}

/** Persist a scheduled run: bump lastRunAt + store this run's violation keys. */
export async function recordScheduleRun(id: string, ranAt: number, keys: string[]): Promise<void> {
  await db.update(codelensSchedules)
    .set({ lastRunAt: new Date(ranAt), lastKeys: keys, updatedAt: new Date() })
    .where(eq(codelensSchedules.id, id));
}

export async function loadScheduleKeys(id: string): Promise<string[]> {
  const rows = await db.select({ k: codelensSchedules.lastKeys }).from(codelensSchedules)
    .where(eq(codelensSchedules.id, id));
  return rows[0]?.k ?? [];
}

// ─── PR policies ──────────────────────────────────────────────────────────────

function rowToPrPolicy(row: typeof codelensPrPolicies.$inferSelect): PrPolicy {
  return {
    repoFullName: row.repoFullName,
    enabled: row.enabled,
    baseBranchPattern: row.baseBranchPattern,
    mode: (row.mode === 'conform' ? 'conform' : 'review') as PrRunMode,
    blocking: row.blocking,
    pushMode: (row.pushMode === 'direct-to-head' ? 'direct-to-head' : 'companion-pr') as PrPushMode,
  };
}

export async function loadPrPolicyFromDb(repoFullName: string): Promise<PrPolicy | null> {
  const rows = await db.select().from(codelensPrPolicies)
    .where(eq(codelensPrPolicies.repoFullName, repoFullName));
  return rows[0] ? rowToPrPolicy(rows[0]) : null;
}

export async function listPrPolicies(): Promise<PrPolicy[]> {
  const rows = await db.select().from(codelensPrPolicies);
  return rows.map(rowToPrPolicy);
}

export async function upsertPrPolicy(p: PrPolicy & { installationId?: number | null }): Promise<void> {
  await db.insert(codelensPrPolicies).values({
    repoFullName: p.repoFullName, enabled: p.enabled, baseBranchPattern: p.baseBranchPattern,
    mode: p.mode, blocking: p.blocking, pushMode: p.pushMode,
    installationId: p.installationId ?? null, updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: codelensPrPolicies.repoFullName,
    set: {
      enabled: p.enabled, baseBranchPattern: p.baseBranchPattern, mode: p.mode,
      blocking: p.blocking, pushMode: p.pushMode,
      installationId: p.installationId ?? null, updatedAt: new Date(),
    },
  });
}

// ─── Loop runs + contested findings ─────────────────────────────────────────

export async function recordLoopRun(input: {
  sessionId: string; userId: string; mode: string; policy: string;
  iterations: number; stopReason: string; finalMetric: unknown;
}): Promise<void> {
  await db.insert(codelensLoopRuns).values({
    sessionId: input.sessionId, userId: input.userId, mode: input.mode, policy: input.policy,
    iterations: input.iterations, stopReason: input.stopReason, finalMetric: input.finalMetric as any,
  });
}

export async function recordContested(input: {
  sessionId: string; userId: string; violationKey: string; ruleId: string; reason: string;
}): Promise<void> {
  await db.insert(codelensContestedFindings).values(input);
}

// ─── DB-backed single-flight scheduler lock ─────────────────────────────────

/**
 * Postgres-based lock: acquire if the key is free or its lease has expired.
 * The atomic upsert-with-predicate means only one instance can win a tick.
 */
export class DbSchedulerLock implements SchedulerLock {
  constructor(private holder: string = `pid-${process.pid}`) {}

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const expires = new Date(Date.now() + ttlMs);
    const res: any = await db.execute(sql`
      INSERT INTO codelens_scheduler_locks (lock_key, holder, expires_at)
      VALUES (${key}, ${this.holder}, ${expires})
      ON CONFLICT (lock_key) DO UPDATE
        SET holder = EXCLUDED.holder, expires_at = EXCLUDED.expires_at
        WHERE codelens_scheduler_locks.expires_at < now()
      RETURNING lock_key
    `);
    const count = res?.rowCount ?? res?.rows?.length ?? (Array.isArray(res) ? res.length : 0);
    return count > 0;
  }

  async release(key: string): Promise<void> {
    await db.delete(codelensSchedulerLocks).where(eq(codelensSchedulerLocks.lockKey, key));
  }
}
