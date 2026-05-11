// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Framework Merger Engine — Orchestrator (Sprint 2 + Sprint 3)
// server/lib/merger/index.ts
//
// Two public methods:
//   merge()                      — Sprint 2 compat: layers 1-4 only
//   mergeRecordingIntoProject()  — Sprint 3: all 7 layers + post-merge
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import { mergeLocators }            from './layer-locators.js';
import { mergePageObjects }         from './layer-page-objects.js';
import { mergeActions }             from './layer-actions.js';
import { mergeBusinessFunctions }   from './layer-business-functions.js';
import { mergeGenericUtils }        from './layer-utils.js';
import { mergeFixtures }            from './layer-fixtures.js';
import { mergeSpec }                from './layer-specs.js';
import { runPostMergeRefactoring }  from './post-merge.js';
import type {
  FrameworkMergeInput,
  FrameworkMergeResult,
  LocatorMergeResult,
  PageObjectMergeResult,
  ActionMergeResult,
  BusinessFunctionMergeResult,
  FullMergeInput,
  FullMergeResult,
} from './types.js';

export class FrameworkMerger {
  // ── Sprint 2 API (layers 1-4, kept for backward compatibility) ───────────────

  /**
   * Merge all 4 framework layers for a single test case recording.
   * Acquires an in-process lock per project.
   * @throws {Error} if project is already locked
   */
  async merge(input: FrameworkMergeInput): Promise<FrameworkMergeResult> {
    const { projectId, tcId } = input;
    const startMs = Date.now();

    if (!mergerDb.tryLock(projectId)) {
      throw new Error(
        `[FrameworkMerger] Project ${projectId} is already locked for merging. ` +
        `Retry after the current merge completes.`,
      );
    }

    try {
      const [locatorResults, pageObjectResults, actionResults, businessFunctionResults] =
        await Promise.all([
          this._mergeAllLocators(projectId, tcId, input.locators),
          this._mergeAllPageObjects(projectId, tcId, input.pageObjects),
          this._mergeAllActions(projectId, tcId, input.actions),
          this._mergeAllBusinessFunctions(projectId, tcId, input.businessFunctions),
        ]);

      const totalAssetsUpserted =
        _sum(locatorResults, 'assetsUpserted') +
        _sum(pageObjectResults, 'assetsUpserted') +
        _sum(actionResults, 'assetsUpserted') +
        _sum(businessFunctionResults, 'assetsUpserted');

      const totalConflictsRaised =
        _sum(locatorResults, 'conflictsRaised') +
        _sum(pageObjectResults, 'conflictsRaised') +
        _sum(actionResults, 'conflictsRaised') +
        _sum(businessFunctionResults, 'conflictsRaised');

      const durationMs = Date.now() - startMs;
      console.log(`[FrameworkMerger] TC ${tcId} merged in ${durationMs}ms — ${totalAssetsUpserted} upserted, ${totalConflictsRaised} conflicts`);

      return {
        projectId, tcId,
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

  // ── Sprint 3 API (all 7 layers + post-merge) ──────────────────────────────────

  /**
   * Merge a full recording into the project — all 7 layers.
   *
   * Execution order:
   *   1. Layers 1-4 in parallel (locators, page objects, actions, business fns)
   *   2. Layers 5-6 in parallel (generic utils, fixtures)
   *   3. Layer 7 sequential (spec — depends on layers 1-6 being committed)
   *   4. Post-merge refactoring (import fix, config regen, dead code warnings)
   *
   * @throws {Error} if project is already locked
   */
  async mergeRecordingIntoProject(input: FullMergeInput): Promise<FullMergeResult> {
    const { projectId, tcId } = input;
    const startMs = Date.now();

    if (!mergerDb.tryLock(projectId)) {
      throw new Error(
        `[FrameworkMerger] Project ${projectId} is already locked for merging. ` +
        `Retry after the current merge completes.`,
      );
    }

    try {
      // ── Layers 1-4 in parallel ───────────────────────────────────────────────
      const [locatorResults, pageObjectResults, actionResults, businessFunctionResults] =
        await Promise.all([
          this._mergeAllLocators(projectId, tcId, input.locators),
          this._mergeAllPageObjects(projectId, tcId, input.pageObjects),
          this._mergeAllActions(projectId, tcId, input.actions),
          this._mergeAllBusinessFunctions(projectId, tcId, input.businessFunctions),
        ]);

      // ── Layers 5-6 in parallel ───────────────────────────────────────────────
      const [utilResult, fixtureResult] = await Promise.all([
        mergeGenericUtils(projectId, tcId, input.genericUtils ?? []),
        mergeFixtures(projectId, tcId, input.fixtures ?? []),
      ]);

      // ── Layer 7 sequential (spec references output of all above) ────────────
      const specResult = await mergeSpec(projectId, tcId, input.spec);

      // ── Post-merge refactoring ───────────────────────────────────────────────
      const refactoringChanges = await runPostMergeRefactoring(projectId);

      // ── Collect new open conflicts ───────────────────────────────────────────
      const openConflicts = await mergerDb.getOpenConflicts(projectId);
      const conflictIds = openConflicts.map(c => c.id);

      // ── Aggregate totals ─────────────────────────────────────────────────────
      const totalAdded =
        _sum(locatorResults, 'assetsUpserted') +
        _sum(pageObjectResults, 'assetsUpserted') +
        _sum(actionResults, 'assetsUpserted') +
        _sum(businessFunctionResults, 'assetsUpserted') +
        utilResult.assetsUpserted +
        fixtureResult.assetsUpserted +
        (specResult.action === 'add' ? 1 : 0);

      const totalSkipped =
        _countDecisions(locatorResults, 'keep') +
        _countDecisions(pageObjectResults, 'keep') +
        _countDecisions(actionResults, 'keep') +
        _countDecisions(businessFunctionResults, 'keep') +
        utilResult.decisions.filter(d => d.action === 'skip').length +
        fixtureResult.decisions.filter(d => d.action === 'skip').length;

      const totalConflicts =
        _sum(locatorResults, 'conflictsRaised') +
        _sum(pageObjectResults, 'conflictsRaised') +
        _sum(actionResults, 'conflictsRaised') +
        _sum(businessFunctionResults, 'conflictsRaised') +
        utilResult.conflictsRaised +
        fixtureResult.conflictsRaised +
        specResult.conflictsRaised;

      const durationMs = Date.now() - startMs;
      console.log(
        `[FrameworkMerger] Full merge TC ${tcId} in ${durationMs}ms — ` +
        `added=${totalAdded} skipped=${totalSkipped} conflicts=${totalConflicts}`,
      );

      return {
        success: true,
        tcSequence: input.spec.tcSequence,
        layers: {
          locators:          locatorResults,
          pageObjects:       pageObjectResults,
          actions:           actionResults,
          businessFunctions: businessFunctionResults,
          genericUtils:      utilResult,
          fixtures:          fixtureResult,
          spec:              specResult,
        },
        conflictIds,
        refactoringChanges,
        totalAdded,
        totalSkipped,
        totalConflicts,
        durationMs,
      };
    } finally {
      mergerDb.unlock(projectId);
    }
  }

  // ── Private layer fans ────────────────────────────────────────────────────────

  private async _mergeAllLocators(
    projectId: string, tcId: string,
    locators: FrameworkMergeInput['locators'],
  ): Promise<LocatorMergeResult[]> {
    return Promise.all(
      Object.entries(locators ?? {}).map(([pageKey, units]) =>
        mergeLocators(projectId, tcId, pageKey, units),
      ),
    );
  }

  private async _mergeAllPageObjects(
    projectId: string, tcId: string,
    pageObjects: FrameworkMergeInput['pageObjects'],
  ): Promise<PageObjectMergeResult[]> {
    return Promise.all(
      Object.entries(pageObjects ?? {}).map(([pageKey, methods]) =>
        mergePageObjects(projectId, tcId, pageKey, methods),
      ),
    );
  }

  private async _mergeAllActions(
    projectId: string, tcId: string,
    actions: FrameworkMergeInput['actions'],
  ): Promise<ActionMergeResult[]> {
    return Promise.all(
      Object.entries(actions ?? {}).map(([domainKey, steps]) =>
        mergeActions(projectId, tcId, domainKey, steps),
      ),
    );
  }

  private async _mergeAllBusinessFunctions(
    projectId: string, tcId: string,
    businessFunctions: FrameworkMergeInput['businessFunctions'],
  ): Promise<BusinessFunctionMergeResult[]> {
    return Promise.all(
      Object.entries(businessFunctions ?? {}).map(([domainKey, fns]) =>
        mergeBusinessFunctions(projectId, tcId, domainKey, fns),
      ),
    );
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _sum<T extends { [K in F]: number }, F extends string>(
  arr: T[],
  field: F,
): number {
  return arr.reduce((s, r) => s + r[field], 0);
}

function _countDecisions(
  results: Array<{ decisions: Array<{ action: string }> }>,
  action: string,
): number {
  return results.reduce(
    (s, r) => s + r.decisions.filter(d => d.action === action).length,
    0,
  );
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const frameworkMerger = new FrameworkMerger();

// ── Re-exports ────────────────────────────────────────────────────────────────

export type {
  FrameworkMergeInput,
  FrameworkMergeResult,
  FullMergeInput,
  FullMergeResult,
  LocatorUnit,
  PageObjectMethod,
  ActionStep,
  BusinessFunction,
  UtilUnit,
  FixtureUnit,
  SpecUnit,
  MergeDecision,
  MergeAction,
  RefactoringChange,
} from './types.js';

export { buildProjectZip } from './zip-builder.js';
