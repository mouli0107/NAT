// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Layer 1: Locators
// server/lib/merger/layer-locators.ts
//
// Merge strategy:
//   1. Load existing locators for the page from DB
//   2. For each incoming LocatorUnit:
//      a. No existing unit with same name → ADD
//      b. Same name + same unit hash     → KEEP (no-op)
//      c. Same name + different hash:
//         - incoming stability > existing → REPLACE (win by quality)
//         - otherwise                    → CONFLICT
//   3. Persist winning units; raise conflict rows for losers
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import {
  hashContent,
  hashUnit,
  selectorStabilityScore,
  buildConflictReason,
} from './utils.js';
import type {
  LocatorUnit,
  LocatorMergeResult,
  MergeDecision,
} from './types.js';

const ASSET_TYPE = 'locator';

/**
 * Build the asset key for a single locator unit.
 * Format: "{pageKey}:{unitName}"
 */
function locatorKey(pageKey: string, unitName: string): string {
  return `${pageKey}:${unitName}`;
}

/**
 * Merge an array of incoming LocatorUnit objects into the DB for one page.
 */
export async function mergeLocators(
  projectId: string,
  tcId: string,
  pageKey: string,
  incoming: LocatorUnit[],
): Promise<LocatorMergeResult> {
  const decisions: Array<MergeDecision<LocatorUnit>> = [];
  let assetsUpserted = 0;
  let conflictsRaised = 0;

  // Enrich incoming units with computed stability scores
  const enriched: LocatorUnit[] = incoming.map(u => ({
    ...u,
    stability: selectorStabilityScore(u.selector),
  }));

  for (const unit of enriched) {
    const key = locatorKey(pageKey, unit.name);
    const incomingHash = hashUnit(unit);
    const incomingContent = JSON.stringify(unit);

    // Fetch existing row (if any)
    const existing = await mergerDb.getAssetsByTypeAndKey(projectId, ASSET_TYPE, key);
    const existingRow = existing[0] ?? null;

    if (!existingRow) {
      // ── ADD ─────────────────────────────────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `locators/${pageKey}.locators.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    unit.name,
        unitHash:    incomingHash,
        layer:       'locator',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId,
        incomingContent,
        hashContent(incomingContent),
        null,
        'created',
        `Added via TC ${tcId}`,
      );

      decisions.push({ action: 'add', resolved: unit });
      assetsUpserted++;
      continue;
    }

    const existingHash = existingRow.unitHash ?? hashUnit(JSON.parse(existingRow.content) as LocatorUnit);

    if (existingHash === incomingHash) {
      // ── KEEP ────────────────────────────────────────────────────────────────
      decisions.push({ action: 'keep', resolved: unit });
      continue;
    }

    // Hash differs — compare stability
    const existingUnit = JSON.parse(existingRow.content) as LocatorUnit;
    const existingStability = existingUnit.stability ?? selectorStabilityScore(existingUnit.selector);
    const incomingStability = unit.stability;

    if (incomingStability > existingStability + 0.05) {
      // ── REPLACE (better selector wins) ──────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `locators/${pageKey}.locators.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    unit.name,
        unitHash:    incomingHash,
        layer:       'locator',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId,
        incomingContent,
        hashContent(incomingContent),
        null,
        'updated',
        `Replaced by more stable selector from TC ${tcId} (${existingStability.toFixed(2)} → ${incomingStability.toFixed(2)})`,
      );

      decisions.push({ action: 'replace', resolved: unit });
      assetsUpserted++;
    } else {
      // ── CONFLICT ─────────────────────────────────────────────────────────────
      const conflictReason = buildConflictReason(existingHash, incomingHash, unit.name);
      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'selector_diverged',
        baseContent:     existingRow.content,
        incomingContent,
        baseTcId:        existingRow.sourceTcId,
        incomingTcId:    tcId,
        aiSuggestion:    null,
      });

      decisions.push({
        action:         'conflict',
        resolved:       existingUnit,   // keep existing until human resolves
        conflictReason,
      });
      conflictsRaised++;
    }
  }

  return { projectId, pageKey, decisions, assetsUpserted, conflictsRaised };
}
