// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 3: Framework Merger Engine — Layer 5: Generic Utils
// server/lib/merger/layer-utils.ts
//
// Merge strategy per incoming UtilUnit:
//
//   SEMANTIC DUPE — different name, same body hash → ADD alias export
//   ADD           — name not seen before, not a semantic dupe → add unit
//                   + scan all spec assets for inline copies → replace with import
//   SKIP          — same name + same body hash → no-op
//   UPDATE        — same name + incoming body is a superset of existing → replace
//   CONFLICT      — same name + body diverged, no superset → flag
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import {
  hashContent,
  hashUnit,
  isFunctionBodySuperset,
  ensureImport,
  buildConflictReason,
} from './utils.js';
import type {
  UtilUnit,
  UtilCategory,
  UtilMergeResult,
  UtilMergeDecision,
} from './types.js';

const ASSET_TYPE = 'generic_util';

// Maps category to canonical file path inside the framework project
const CATEGORY_FILE: Record<UtilCategory, string> = {
  wait:    'utils/wait.utils.ts',
  data:    'utils/data.utils.ts',
  assert:  'utils/assert.utils.ts',
  api:     'utils/api.utils.ts',
  general: 'utils/helpers.ts',
};

function utilKey(functionName: string): string {
  return `utils.${functionName}`;
}

/**
 * Merge an array of incoming UtilUnits into the project's util layer.
 */
export async function mergeGenericUtils(
  projectId: string,
  tcId: string,
  incoming: UtilUnit[],
): Promise<UtilMergeResult> {
  const decisions: UtilMergeDecision[] = [];
  let assetsUpserted = 0;
  let conflictsRaised = 0;
  let inlineReplacementsCount = 0;

  // Load all existing util assets for this project once (avoid N+1)
  const existingRows = await mergerDb.getAssetsByType(projectId, ASSET_TYPE);
  const existingUnits: Array<{ row: typeof existingRows[0]; unit: UtilUnit }> =
    existingRows.map(row => ({
      row,
      unit: JSON.parse(row.content) as UtilUnit,
    }));

  for (const incoming_unit of incoming) {
    const incomingBodyHash = hashContent(incoming_unit.functionBody);
    const incomingUnitHash = hashUnit(incoming_unit as unknown as Record<string, unknown>);
    const key = utilKey(incoming_unit.functionName);
    const filePath = CATEGORY_FILE[incoming_unit.category];
    const incomingContent = JSON.stringify(incoming_unit);

    // Check for semantic duplicate (different name, same body)
    const semanticDupe = existingUnits.find(
      e =>
        e.unit.functionName !== incoming_unit.functionName &&
        hashContent(e.unit.functionBody) === incomingBodyHash,
    );

    if (semanticDupe) {
      // Add alias export pointing to the canonical name
      const aliasContent = JSON.stringify({
        ...incoming_unit,
        aliasOf: semanticDupe.unit.functionName,
        functionBody: `// alias: re-exported as ${incoming_unit.functionName}\nexport { ${semanticDupe.unit.functionName} as ${incoming_unit.functionName} } from './${semanticDupe.row.filePath}';`,
      });

      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath,
        content:     aliasContent,
        contentHash: hashContent(aliasContent),
        unitName:    incoming_unit.functionName,
        unitHash:    incomingUnitHash,
        layer:       'util',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, aliasContent, hashContent(aliasContent), null, 'created',
        `Alias of ${semanticDupe.unit.functionName} (same body, different name) from TC ${tcId}`,
      );

      await mergerDb.logDedup({
        projectId,
        dedupType:         'util_alias',
        canonicalKey:      utilKey(semanticDupe.unit.functionName),
        removedKeys:       [key],
        referencesUpdated: 0,
      });

      decisions.push({ action: 'alias', unitName: incoming_unit.functionName,
        reason: `Semantic duplicate of "${semanticDupe.unit.functionName}"` });
      assetsUpserted++;
      continue;
    }

    // Check for same-name existing unit
    const byKey = existingUnits.find(e => e.unit.functionName === incoming_unit.functionName);

    if (!byKey) {
      // ── ADD ────────────────────────────────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    incoming_unit.functionName,
        unitHash:    incomingUnitHash,
        layer:       'util',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'created', `Added via TC ${tcId}`,
      );

      // Scan existing spec assets for inline copies of this util body
      const replaced = await _replaceInlineUtils(
        projectId, tcId, incoming_unit.functionName,
        incoming_unit.functionBody, filePath,
      );
      inlineReplacementsCount += replaced;

      decisions.push({ action: 'add', unitName: incoming_unit.functionName });
      assetsUpserted++;

      // Add to in-memory list so subsequent units in this batch can detect dupes
      existingUnits.push({ row: { ...byKey?.row ?? {} as typeof existingRows[0], content: incomingContent, filePath }, unit: incoming_unit });
      continue;
    }

    // Same name — compare hashes
    const existingBodyHash = hashContent(byKey.unit.functionBody);

    if (existingBodyHash === incomingBodyHash) {
      // ── SKIP ──────────────────────────────────────────────────────────────
      decisions.push({ action: 'skip', unitName: incoming_unit.functionName });
      continue;
    }

    // Body differs — check superset
    if (isFunctionBodySuperset(byKey.unit.functionBody, incoming_unit.functionBody)) {
      // ── UPDATE (incoming covers all existing logic + more) ─────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    incoming_unit.functionName,
        unitHash:    incomingUnitHash,
        layer:       'util',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'updated',
        `Replaced by superset implementation from TC ${tcId}`,
      );

      decisions.push({ action: 'update', unitName: incoming_unit.functionName,
        reason: 'Incoming body is a superset of existing' });
      assetsUpserted++;
    } else {
      // ── CONFLICT ──────────────────────────────────────────────────────────
      const existingHash = hashUnit(byKey.unit as unknown as Record<string, unknown>);
      const conflictReason = buildConflictReason(existingHash, incomingUnitHash, incoming_unit.functionName);

      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'util_body_diverged',
        baseContent:     byKey.row.content,
        incomingContent,
        baseTcId:        byKey.row.sourceTcId ?? null,
        incomingTcId:    tcId,
        aiSuggestion:    null,
      });

      decisions.push({ action: 'conflict', unitName: incoming_unit.functionName, reason: conflictReason });
      conflictsRaised++;
    }
  }

  return { projectId, decisions, assetsUpserted, conflictsRaised, inlineReplacementsCount };
}

/**
 * Scan all spec assets for inline code that duplicates the shared util body.
 * Replace with an import + call site reference.
 * Returns the number of spec files updated.
 */
async function _replaceInlineUtils(
  projectId: string,
  _tcId: string,
  utilName: string,
  utilBody: string,
  utilFilePath: string,
): Promise<number> {
  const specs = await mergerDb.getAssetsByType(projectId, 'spec');
  let updated = 0;

  // Derive the import path from utilFilePath ("utils/helpers.ts" → "utils/helpers")
  const importPath = utilFilePath.replace(/\.ts$/, '');

  for (const spec of specs) {
    const trimmedBody = utilBody.trim();
    if (!spec.content.includes(trimmedBody)) continue;

    // Replace inline body with a call to the named function
    let newContent = spec.content.replace(trimmedBody, `${utilName}()`);
    // Ensure the import exists
    newContent = ensureImport(newContent, utilName, `./${importPath}`);

    if (newContent !== spec.content) {
      const newHash = hashContent(newContent);
      await mergerDb.updateAsset(spec.id, {
        content:     newContent,
        contentHash: newHash,
        changeNote:  `Replaced inline ${utilName} body with shared utility import`,
      });
      await mergerDb.appendVersion(
        spec.id, newContent, newHash, null, 'updated',
        `Auto-refactored: replaced inline ${utilName} with import`,
      );
      updated++;
    }
  }

  return updated;
}
