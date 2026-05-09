// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 3: Framework Merger Engine — Layer 7: Specs
// server/lib/merger/layer-specs.ts
//
// Merge strategy per incoming SpecUnit:
//
//   ADD     — tcSequence not in DB → clean imports + persist
//   REPLACE — tcSequence exists, same user re-recording → archive + overwrite
//   VERSION — tcSequence exists, different user → store v2 + raise CONFLICT
//
// Post-ADD: cleanSpecImports replaces hardcoded selectors with locator refs.
// Post-ALL: checkForSimilarSpecs flags >85% token-Jaccard similarity.
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import {
  hashContent,
  toKebabCase,
  parseLocatorContent,
  updateImportPaths,
  contentSimilarity,
} from './utils.js';
import type {
  SpecUnit,
  SpecMergeResult,
} from './types.js';

const ASSET_TYPE = 'spec';
const SIMILARITY_THRESHOLD = 0.85;

function specFilePath(unit: SpecUnit): string {
  return (
    `tests/${unit.moduleName}/${unit.featureName}/` +
    `${unit.tcSequence}-${toKebabCase(unit.tcName)}.spec.ts`
  );
}

export async function mergeSpec(
  projectId: string,
  tcId: string,
  incoming: SpecUnit,
): Promise<SpecMergeResult> {
  const key = incoming.tcSequence;
  const filePath = specFilePath(incoming);
  let conflictsRaised = 0;
  const similarSpecs: string[] = [];

  // Load existing spec for this TC sequence (if any)
  const existingRows = await mergerDb.getAssetsByTypeAndKey(projectId, ASSET_TYPE, key);
  const existingRow = existingRows[0] ?? null;

  let action: SpecMergeResult['action'];

  if (!existingRow) {
    // ── ADD ──────────────────────────────────────────────────────────────────
    const cleanedContent = await _cleanSpecImports(projectId, incoming.content);
    const finalContent = updateImportPaths(cleanedContent);
    const contentHash = hashContent(finalContent);

    const assetId = await mergerDb.upsertAsset({
      projectId,
      assetType:   ASSET_TYPE,
      assetKey:    key,
      filePath,
      content:     finalContent,
      contentHash,
      unitName:    incoming.tcName,
      unitHash:    hashContent(incoming.tcSequence),
      layer:       'spec',
      createdBy:   incoming.recordedBy,
      sourceTcId:  tcId,
    });

    await mergerDb.appendVersion(
      assetId, finalContent, contentHash,
      incoming.recordedBy, 'created',
      `Initial recording by ${incoming.recordedBy} via TC ${tcId}`,
    );

    action = 'add';
  } else {
    const existingUnit = _parseSpecMeta(existingRow);

    if (existingUnit.recordedBy === incoming.recordedBy) {
      // ── REPLACE (same user re-recording) ────────────────────────────────────
      const cleanedContent = await _cleanSpecImports(projectId, incoming.content);
      const finalContent = updateImportPaths(cleanedContent);
      const contentHash = hashContent(finalContent);

      await mergerDb.updateAsset(existingRow.id, {
        content:     finalContent,
        contentHash,
        unitHash:    hashContent(incoming.tcSequence),
        updatedBy:   incoming.recordedBy,
        changeNote:  `Re-recorded by ${incoming.recordedBy} via TC ${tcId}`,
      });

      await mergerDb.appendVersion(
        existingRow.id, finalContent, contentHash,
        incoming.recordedBy, 'updated',
        `Re-recorded by same user ${incoming.recordedBy}`,
      );

      action = 'replace';
    } else {
      // ── VERSION (different user — store v2, raise conflict) ─────────────────
      const v2Key = `${incoming.tcSequence}_v2`;
      const v2FilePath = filePath.replace('.spec.ts', '_v2.spec.ts');
      const cleanedContent = await _cleanSpecImports(projectId, incoming.content);
      const finalContent = updateImportPaths(cleanedContent);
      const contentHash = hashContent(finalContent);

      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    v2Key,
        filePath:    v2FilePath,
        content:     finalContent,
        contentHash,
        unitName:    `${incoming.tcName} (v2)`,
        unitHash:    hashContent(v2Key),
        layer:       'spec',
        createdBy:   incoming.recordedBy,
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, finalContent, contentHash,
        incoming.recordedBy, 'created',
        `Alternative recording by ${incoming.recordedBy} via TC ${tcId}`,
      );

      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'duplicate_tc',
        baseContent:     existingRow.content,
        incomingContent: finalContent,
        baseTcId:        existingRow.sourceTcId ?? null,
        incomingTcId:    tcId,
        aiSuggestion:
          `Two different users recorded "${incoming.tcSequence}". ` +
          `Original: ${existingUnit.recordedBy}. ` +
          `Alternative stored as v2 (${v2FilePath}). ` +
          `Team lead should consolidate.`,
      });

      conflictsRaised++;
      action = 'version';
    }
  }

  // ── Check for similar specs (flag only — do NOT auto-delete) ────────────────
  const allSpecs = await mergerDb.getAssetsByType(projectId, ASSET_TYPE);
  for (const existing of allSpecs) {
    if (existing.assetKey === key || existing.assetKey.endsWith('_v2')) continue;
    const sim = contentSimilarity(incoming.content, existing.content);
    if (sim >= SIMILARITY_THRESHOLD) {
      similarSpecs.push(existing.assetKey);
    }
  }

  return { projectId, tcSequence: key, filePath, action, conflictsRaised, similarSpecs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Spec import cleaning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clean a spec's content by replacing hardcoded selector strings with
 * references to the named locator variables stored in the locators layer.
 */
async function _cleanSpecImports(
  projectId: string,
  specContent: string,
): Promise<string> {
  const locatorRows = await mergerDb.getAssetsByType(projectId, 'locator');
  let cleaned = specContent;

  for (const row of locatorRows) {
    const { selector, variableName } = parseLocatorContent(row.content);
    if (!selector || !variableName) continue;

    // Replace quoted selector literals ("selector" or 'selector') with the variable name
    // Only replace if the variable name is a valid identifier (avoid replacing in comments)
    const doubleQ = `"${selector}"`;
    const singleQ = `'${selector}'`;
    if (cleaned.includes(doubleQ)) {
      cleaned = cleaned.replaceAll(doubleQ, variableName);
    } else if (cleaned.includes(singleQ)) {
      cleaned = cleaned.replaceAll(singleQ, variableName);
    }
  }

  return cleaned;
}

/** Extract recordedBy from either createdBy field or meta JSON */
function _parseSpecMeta(row: { createdBy?: string | null; content?: string }): { recordedBy: string } {
  if (row.createdBy) return { recordedBy: row.createdBy };
  try {
    const parsed = JSON.parse(row.content ?? '{}') as { recordedBy?: string };
    return { recordedBy: parsed.recordedBy ?? 'unknown' };
  } catch {
    return { recordedBy: 'unknown' };
  }
}
