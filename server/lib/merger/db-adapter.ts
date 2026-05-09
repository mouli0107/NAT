// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — DB Adapter
// server/lib/merger/db-adapter.ts
//
// Wraps Drizzle ORM operations needed by the merger layers.
// Single place for all SQL; layers stay pure TypeScript logic.
// ─────────────────────────────────────────────────────────────────────────────

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db.js';
import {
  frameworkAssets,
  assetVersions,
  assetConflicts,
  deduplicationLog,
} from '@shared/schema';
import type {
  FrameworkAsset,
  InsertFrameworkAsset,
  AssetConflict,
} from '@shared/schema';

// ── In-process project lock ───────────────────────────────────────────────────
// MVP: single-server deployment. Upgrade path: pg_try_advisory_xact_lock().
const _locks = new Map<string, true>();

export class MergerDb {
  // ── Locking ─────────────────────────────────────────────────────────────────

  /**
   * Acquire an in-process exclusive lock per projectId.
   * Returns true if lock was acquired, false if already locked.
   */
  tryLock(projectId: string): boolean {
    if (_locks.has(projectId)) return false;
    _locks.set(projectId, true);
    return true;
  }

  unlock(projectId: string): void {
    _locks.delete(projectId);
  }

  // ── Asset reads ──────────────────────────────────────────────────────────────

  /**
   * Return all assets of a given type+key prefix for a project.
   * assetKey acts as a namespace: "LoginPage:submitButton", "login:fillForm", etc.
   */
  async getAssetsByTypeAndKey(
    projectId: string,
    assetType: string,
    assetKey: string,
  ): Promise<FrameworkAsset[]> {
    return db
      .select()
      .from(frameworkAssets)
      .where(
        and(
          eq(frameworkAssets.projectId, projectId),
          eq(frameworkAssets.assetType, assetType),
          eq(frameworkAssets.assetKey, assetKey),
        ),
      );
  }

  /**
   * Return all assets of a given type for a project (entire layer).
   */
  async getAssetsByType(
    projectId: string,
    assetType: string,
  ): Promise<FrameworkAsset[]> {
    return db
      .select()
      .from(frameworkAssets)
      .where(
        and(
          eq(frameworkAssets.projectId, projectId),
          eq(frameworkAssets.assetType, assetType),
        ),
      );
  }

  // ── Asset writes ─────────────────────────────────────────────────────────────

  /**
   * Upsert a framework asset (INSERT … ON CONFLICT … DO UPDATE).
   * Returns the ID of the persisted row.
   */
  async upsertAsset(row: InsertFrameworkAsset): Promise<string> {
    const result = await db
      .insert(frameworkAssets)
      .values(row)
      .onConflictDoUpdate({
        target: [
          frameworkAssets.projectId,
          frameworkAssets.assetType,
          frameworkAssets.assetKey,
        ],
        set: {
          content:     row.content,
          contentHash: row.contentHash ?? null,
          unitHash:    row.unitHash ?? null,
          unitName:    row.unitName ?? null,
          updatedBy:   row.updatedBy ?? null,
          sourceTcId:  row.sourceTcId ?? null,
          updatedAt:   sql`now()`,
        },
      })
      .returning({ id: frameworkAssets.id });

    return result[0].id;
  }

  // ── Version history ───────────────────────────────────────────────────────────

  /**
   * Append a version entry for an asset.
   */
  async appendVersion(
    assetId: string,
    content: string,
    contentHash: string | null,
    changedBy: string | null,
    changeType: 'created' | 'updated' | 'reverted',
    changeNote: string,
  ): Promise<void> {
    // Determine next version number
    const rows = await db
      .select({ max: sql<number>`COALESCE(MAX(version_num), 0)` })
      .from(assetVersions)
      .where(eq(assetVersions.assetId, assetId));

    const nextVersion = (rows[0]?.max ?? 0) + 1;

    await db.insert(assetVersions).values({
      assetId,
      versionNum:  nextVersion,
      content,
      contentHash: contentHash ?? null,
      changedBy:   changedBy ?? null,
      changeType,
      changeNote,
    });
  }

  // ── Conflicts ────────────────────────────────────────────────────────────────

  /**
   * Record a merge conflict for human resolution.
   */
  async raiseConflict(conflict: {
    projectId:       string;
    assetType:       string;
    assetKey:        string;
    conflictType:    string;
    baseContent:     string;
    incomingContent: string;
    baseTcId:        string | null;
    incomingTcId:    string | null;
    aiSuggestion:    string | null;
  }): Promise<string> {
    const result = await db
      .insert(assetConflicts)
      .values({
        projectId:       conflict.projectId,
        assetType:       conflict.assetType,
        assetKey:        conflict.assetKey,
        conflictType:    conflict.conflictType,
        baseContent:     conflict.baseContent,
        incomingContent: conflict.incomingContent,
        baseAuthor:      null,
        incomingAuthor:  null,
        baseTcId:        conflict.baseTcId,
        incomingTcId:    conflict.incomingTcId,
        aiSuggestion:    conflict.aiSuggestion,
        status:          'open',
      })
      .returning({ id: assetConflicts.id });

    return result[0].id;
  }

  /**
   * Return open conflicts for a project (for UI display).
   */
  async getOpenConflicts(projectId: string): Promise<AssetConflict[]> {
    return db
      .select()
      .from(assetConflicts)
      .where(
        and(
          eq(assetConflicts.projectId, projectId),
          eq(assetConflicts.status, 'open'),
        ),
      );
  }

  // ── Deduplication log ────────────────────────────────────────────────────────

  async logDedup(entry: {
    projectId:         string;
    dedupType:         string;
    canonicalKey:      string;
    removedKeys:       string[];
    referencesUpdated: number;
  }): Promise<void> {
    await db.insert(deduplicationLog).values({
      projectId:         entry.projectId,
      dedupType:         entry.dedupType,
      canonicalKey:      entry.canonicalKey,
      removedKeys:       entry.removedKeys,
      referencesUpdated: entry.referencesUpdated,
      performedBy:       'auto',
    });
  }
}

// Singleton instance — shared across all merger layer files
export const mergerDb = new MergerDb();
