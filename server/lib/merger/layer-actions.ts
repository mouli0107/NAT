// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 2: Framework Merger Engine — Layer 3: Actions
// server/lib/merger/layer-actions.ts
//
// Merge strategy (per action step):
//   ADD      — step description not in DB
//   KEEP     — same unit hash
//   REPLACE  — incoming has superset of method refs (more complete)
//   CONFLICT — code diverged without superset relationship → human review
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
  ActionStep,
  ActionMergeResult,
  MergeDecision,
} from './types.js';

const ASSET_TYPE = 'action_step';

function stepKey(domainKey: string, description: string): string {
  // Normalise description to a deterministic key (trim + lower)
  const norm = description.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 200);
  return `${domainKey}:${norm}`;
}

export async function mergeActions(
  projectId: string,
  tcId: string,
  domainKey: string,
  incoming: ActionStep[],
): Promise<ActionMergeResult> {
  const decisions: Array<MergeDecision<ActionStep>> = [];
  let assetsUpserted = 0;
  let conflictsRaised = 0;

  for (const step of incoming) {
    const enriched: ActionStep = {
      ...step,
      methodRefs: step.methodRefs.length > 0
        ? step.methodRefs
        : extractReferences(step.code),
    };

    const key = stepKey(domainKey, enriched.description);
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
        filePath:    `actions/business/${domainKey}.actions.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    enriched.description,
        unitHash:    incomingHash,
        layer:       'action',
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

    const existingHash = existingRow.unitHash ?? hashUnit(JSON.parse(existingRow.content) as ActionStep);

    if (existingHash === incomingHash) {
      decisions.push({ action: 'keep', resolved: enriched });
      continue;
    }

    const existingStep = JSON.parse(existingRow.content) as ActionStep;
    const incomingIsSuperset = isSuperset(enriched.methodRefs, existingStep.methodRefs);

    if (incomingIsSuperset) {
      // ── REPLACE ───────────────────────────────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    `actions/business/${domainKey}.actions.ts`,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    enriched.description,
        unitHash:    incomingHash,
        layer:       'action',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'updated',
        `Replaced by superset step from TC ${tcId}`,
      );

      decisions.push({ action: 'replace', resolved: enriched });
      assetsUpserted++;
    } else {
      // ── CONFLICT ──────────────────────────────────────────────────────────────
      const conflictReason = buildConflictReason(existingHash, incomingHash, enriched.description);

      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'step_code_diverged',
        baseContent:     existingRow.content,
        incomingContent,
        baseTcId:        existingRow.sourceTcId,
        incomingTcId:    tcId,
        aiSuggestion:    null,
      });

      decisions.push({
        action:         'conflict',
        resolved:       existingStep,
        conflictReason,
      });
      conflictsRaised++;
    }
  }

  return { projectId, domainKey, decisions, assetsUpserted, conflictsRaised };
}
