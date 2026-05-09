// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Layer 2: Page Objects
// server/lib/merger/layer-page-objects.ts
//
// Merge strategy (per method):
//   ADD    — method name not in DB yet
//   KEEP   — same unit hash (body unchanged)
//   REPLACE — incoming has a superset of locator refs (more complete method)
//   CONFLICT — body diverged without one being a superset → human review
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import {
  hashContent,
  hashUnit,
  isSuperset,
  extractReferences,
  buildConflictReason,
} from './utils.js';
import type {
  PageObjectMethod,
  PageObjectMergeResult,
  MergeDecision,
} from './types.js';

const ASSET_TYPE = 'page_object_method';

function methodKey(pageKey: string, methodName: string): string {
  return `${pageKey}:${methodName}`;
}

export async function mergePageObjects(
  projectId: string,
  tcId: string,
  pageKey: string,
  incoming: PageObjectMethod[],
): Promise<PageObjectMergeResult> {
  const decisions: Array<MergeDecision<PageObjectMethod>> = [];
  let assetsUpserted = 0;
  let conflictsRaised = 0;

  for (const method of incoming) {
    // Enrich locatorRefs from body if caller didn't provide them
    const enriched: PageObjectMethod = {
      ...method,
      locatorRefs: method.locatorRefs.length > 0
        ? method.locatorRefs
        : extractReferences(method.body),
    };

    const key = methodKey(pageKey, enriched.name);
    const incomingHash = hashUnit(enriched);
    const incomingContent = JSON.stringify(enriched);

    const existing = await mergerDb.getAssetsByTypeAndKey(projectId, ASSET_TYPE, key);
    const existingRow = existing[0] ?? null;

    if (!existingRow) {
      // ── ADD ──────────────────────────────────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `pages/${pageKey}.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    enriched.name,
        unitHash:    incomingHash,
        layer:       'page_object',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'created', `Added via TC ${tcId}`,
      );

      decisions.push({ action: 'add', resolved: enriched });
      assetsUpserted++;
      continue;
    }

    const existingHash = existingRow.unitHash ?? hashUnit(JSON.parse(existingRow.content) as PageObjectMethod);

    if (existingHash === incomingHash) {
      decisions.push({ action: 'keep', resolved: enriched });
      continue;
    }

    // Hash differs — check if incoming is a superset of locator refs
    const existingMethod = JSON.parse(existingRow.content) as PageObjectMethod;
    const existingRefs = existingMethod.locatorRefs;
    const incomingRefs = enriched.locatorRefs;

    const incomingIsSuperset = isSuperset(incomingRefs, existingRefs);

    if (incomingIsSuperset) {
      // ── REPLACE (incoming covers everything the existing did + more) ─────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `pages/${pageKey}.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    enriched.name,
        unitHash:    incomingHash,
        layer:       'page_object',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'updated',
        `Replaced by superset method from TC ${tcId} (refs: ${incomingRefs.join(', ')})`,
      );

      decisions.push({ action: 'replace', resolved: enriched });
      assetsUpserted++;
    } else {
      // ── CONFLICT ──────────────────────────────────────────────────────────────
      const conflictReason = buildConflictReason(existingHash, incomingHash, enriched.name);

      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'method_body_diverged',
        baseContent:     existingRow.content,
        incomingContent,
        baseTcId:        existingRow.sourceTcId,
        incomingTcId:    tcId,
        aiSuggestion:    null,
      });

      decisions.push({
        action:         'conflict',
        resolved:       existingMethod,
        conflictReason,
      });
      conflictsRaised++;
    }
  }

  return { projectId, pageKey, decisions, assetsUpserted, conflictsRaised };
}
