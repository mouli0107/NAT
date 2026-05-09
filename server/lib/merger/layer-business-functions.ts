// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Layer 4: Business Functions
// server/lib/merger/layer-business-functions.ts
//
// Merge strategy (per function):
//   ADD      — function name not in DB
//   KEEP     — same unit hash
//   REPLACE  — incoming step refs are a superset
//   CONFLICT — body diverged without superset
//
// Additional: when two functions share >80% step overlap (Jaccard), emit a
// merge_suggestion ("consider combining into a single compound function").
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import {
  hashContent,
  hashUnit,
  isSuperset,
  calculateStepOverlap,
  buildConflictReason,
} from './utils.js';
import type {
  BusinessFunction,
  BusinessFunctionMergeResult,
  MergeDecision,
} from './types.js';

const ASSET_TYPE = 'business_function';
const MERGE_SUGGESTION_THRESHOLD = 0.8;

function fnKey(domainKey: string, fnName: string): string {
  return `${domainKey}:${fnName}`;
}

export async function mergeBusinessFunctions(
  projectId: string,
  tcId: string,
  domainKey: string,
  incoming: BusinessFunction[],
): Promise<BusinessFunctionMergeResult> {
  const decisions: Array<MergeDecision<BusinessFunction>> = [];
  let assetsUpserted = 0;
  let conflictsRaised = 0;
  let mergeSuggestion: string | undefined;

  // Load all existing functions for this domain to check cross-function overlap
  const allExisting = await mergerDb.getAssetsByType(projectId, ASSET_TYPE);
  const domainExisting = allExisting
    .filter(r => r.assetKey.startsWith(`${domainKey}:`))
    .map(r => JSON.parse(r.content) as BusinessFunction);

  for (const fn of incoming) {
    const key = fnKey(domainKey, fn.name);
    const incomingHash = hashUnit(fn);
    const incomingContent = JSON.stringify(fn);

    const existing = await mergerDb.getAssetsByTypeAndKey(projectId, ASSET_TYPE, key);
    const existingRow = existing[0] ?? null;

    if (!existingRow) {
      // ── ADD ──────────────────────────────────────────────────────────────────
      // Check for high overlap with any existing function in the domain
      for (const existingFn of domainExisting) {
        const overlap = calculateStepOverlap(fn.stepRefs, existingFn.stepRefs);
        if (overlap >= MERGE_SUGGESTION_THRESHOLD && fn.name !== existingFn.name) {
          mergeSuggestion =
            `Functions "${fn.name}" and "${existingFn.name}" share ` +
            `${Math.round(overlap * 100)}% step overlap. ` +
            `Consider combining them into a single compound function ` +
            `that accepts a parameter to distinguish the variant.`;
          break;
        }
      }

      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `actions/business/${domainKey}.actions.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    fn.name,
        unitHash:    incomingHash,
        layer:       'business_function',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'created', `Added via TC ${tcId}`,
      );

      decisions.push({ action: 'add', resolved: fn });
      assetsUpserted++;
      continue;
    }

    const existingHash = existingRow.unitHash ?? hashUnit(JSON.parse(existingRow.content) as BusinessFunction);

    if (existingHash === incomingHash) {
      decisions.push({ action: 'keep', resolved: fn });
      continue;
    }

    const existingFn = JSON.parse(existingRow.content) as BusinessFunction;
    const incomingIsSuperset = isSuperset(fn.stepRefs, existingFn.stepRefs);

    if (incomingIsSuperset) {
      // ── REPLACE ───────────────────────────────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `actions/business/${domainKey}.actions.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    fn.name,
        unitHash:    incomingHash,
        layer:       'business_function',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'updated',
        `Replaced by superset function from TC ${tcId} (covers ${fn.stepRefs.join(', ')})`,
      );

      decisions.push({ action: 'replace', resolved: fn });
      assetsUpserted++;
    } else {
      // ── CONFLICT ──────────────────────────────────────────────────────────────
      const overlap = calculateStepOverlap(fn.stepRefs, existingFn.stepRefs);
      const conflictReason = buildConflictReason(existingHash, incomingHash, fn.name);

      // Emit merge suggestion if overlap is high even though bodies differ
      if (overlap >= MERGE_SUGGESTION_THRESHOLD && !mergeSuggestion) {
        mergeSuggestion =
          `"${fn.name}" conflicts with existing function but shares ` +
          `${Math.round(overlap * 100)}% step overlap. ` +
          `Consider merging both bodies into a single parameterised function.`;
      }

      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'function_body_diverged',
        baseContent:     existingRow.content,
        incomingContent,
        baseTcId:        existingRow.sourceTcId,
        incomingTcId:    tcId,
        aiSuggestion:    mergeSuggestion ?? null,
      });

      decisions.push({
        action:         'conflict',
        resolved:       existingFn,
        conflictReason,
      });
      conflictsRaised++;
    }
  }

  return {
    projectId,
    domainKey,
    decisions,
    assetsUpserted,
    conflictsRaised,
    mergeSuggestion,
  };
}
