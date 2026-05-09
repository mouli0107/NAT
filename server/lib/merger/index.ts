// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Orchestrator
// server/lib/merger/index.ts
//
// Entry point: FrameworkMerger.merge(input) fans out to all 4 layers in
// parallel, then aggregates results.
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import { mergeLocators } from './layer-locators.js';
import { mergePageObjects } from './layer-page-objects.js';
import { mergeActions } from './layer-actions.js';
import { mergeBusinessFunctions } from './layer-business-functions.js';
import type {
  FrameworkMergeInput,
  FrameworkMergeResult,
  LocatorMergeResult,
  PageObjectMergeResult,
  ActionMergeResult,
  BusinessFunctionMergeResult,
} from './types.js';

export class FrameworkMerger {
  /**
   * Merge all 4 framework layers for a single test case recording.
   *
   * Acquires an in-process lock per project to prevent concurrent merges
   * from racing on the same assets.
   *
   * @throws {Error} if project is already locked (concurrent merge in progress)
   */
  async merge(input: FrameworkMergeInput): Promise<FrameworkMergeResult> {
    const { projectId, tcId } = input;
    const startMs = Date.now();

    // Acquire exclusive lock for this project
    if (!mergerDb.tryLock(projectId)) {
      throw new Error(
        `[FrameworkMerger] Project ${projectId} is already locked for merging. ` +
        `Retry after the current merge completes.`,
      );
    }

    try {
      // ── Fan-out: run all 4 layers in parallel ──────────────────────────────
      const [
        locatorResults,
        pageObjectResults,
        actionResults,
        businessFunctionResults,
      ] = await Promise.all([
        this._mergeAllLocators(projectId, tcId, input.locators),
        this._mergeAllPageObjects(projectId, tcId, input.pageObjects),
        this._mergeAllActions(projectId, tcId, input.actions),
        this._mergeAllBusinessFunctions(projectId, tcId, input.businessFunctions),
      ]);

      // ── Aggregate totals ───────────────────────────────────────────────────
      const totalAssetsUpserted =
        locatorResults.reduce((s, r) => s + r.assetsUpserted, 0) +
        pageObjectResults.reduce((s, r) => s + r.assetsUpserted, 0) +
        actionResults.reduce((s, r) => s + r.assetsUpserted, 0) +
        businessFunctionResults.reduce((s, r) => s + r.assetsUpserted, 0);

      const totalConflictsRaised =
        locatorResults.reduce((s, r) => s + r.conflictsRaised, 0) +
        pageObjectResults.reduce((s, r) => s + r.conflictsRaised, 0) +
        actionResults.reduce((s, r) => s + r.conflictsRaised, 0) +
        businessFunctionResults.reduce((s, r) => s + r.conflictsRaised, 0);

      const durationMs = Date.now() - startMs;

      console.log(
        `[FrameworkMerger] TC ${tcId} merged in ${durationMs}ms — ` +
        `${totalAssetsUpserted} upserted, ${totalConflictsRaised} conflicts`,
      );

      return {
        projectId,
        tcId,
        locators:          locatorResults,
        pageObjects:       pageObjectResults,
        actions:           actionResults,
        businessFunctions: businessFunctionResults,
        totalAssetsUpserted,
        totalConflictsRaised,
        durationMs,
      };
    } finally {
      mergerDb.unlock(projectId);
    }
  }

  // ── Private layer fans ─────────────────────────────────────────────────────

  private async _mergeAllLocators(
    projectId: string,
    tcId: string,
    locators: FrameworkMergeInput['locators'],
  ): Promise<LocatorMergeResult[]> {
    return Promise.all(
      Object.entries(locators).map(([pageKey, units]) =>
        mergeLocators(projectId, tcId, pageKey, units),
      ),
    );
  }

  private async _mergeAllPageObjects(
    projectId: string,
    tcId: string,
    pageObjects: FrameworkMergeInput['pageObjects'],
  ): Promise<PageObjectMergeResult[]> {
    return Promise.all(
      Object.entries(pageObjects).map(([pageKey, methods]) =>
        mergePageObjects(projectId, tcId, pageKey, methods),
      ),
    );
  }

  private async _mergeAllActions(
    projectId: string,
    tcId: string,
    actions: FrameworkMergeInput['actions'],
  ): Promise<ActionMergeResult[]> {
    return Promise.all(
      Object.entries(actions).map(([domainKey, steps]) =>
        mergeActions(projectId, tcId, domainKey, steps),
      ),
    );
  }

  private async _mergeAllBusinessFunctions(
    projectId: string,
    tcId: string,
    businessFunctions: FrameworkMergeInput['businessFunctions'],
  ): Promise<BusinessFunctionMergeResult[]> {
    return Promise.all(
      Object.entries(businessFunctions).map(([domainKey, fns]) =>
        mergeBusinessFunctions(projectId, tcId, domainKey, fns),
      ),
    );
  }
}

// Singleton — import this in routes/workers
export const frameworkMerger = new FrameworkMerger();

// Re-export types for consumers
export type {
  FrameworkMergeInput,
  FrameworkMergeResult,
  LocatorUnit,
  PageObjectMethod,
  ActionStep,
  BusinessFunction,
  MergeDecision,
  MergeAction,
} from './types.js';
