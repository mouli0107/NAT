// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 3: Framework Merger Engine — Layer 6: Fixtures
// server/lib/merger/layer-fixtures.ts
//
// Merge strategy per incoming FixtureUnit:
//
//   ADD          — fixture name not in DB → persist as-is
//   SKIP         — same name, same factory hash → no-op
//   PARAMETERIZE — same name, different factory, ≤3 differing lines
//                  → replace with parameterized version
//   NAMESPACE    — same name, too complex to parameterize
//                  → store as fixtureName_scope, raise CONFLICT for review
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import { hashContent, hashUnit, buildConflictReason } from './utils.js';
import type {
  FixtureUnit,
  FixtureMergeResult,
  FixtureMergeDecision,
} from './types.js';

const ASSET_TYPE = 'fixture';
const FIXTURE_FILE = 'fixtures/test-fixtures.ts';

function fixtureKey(fixtureName: string): string {
  return `fixture.${fixtureName}`;
}

export async function mergeFixtures(
  projectId: string,
  tcId: string,
  incoming: FixtureUnit[],
): Promise<FixtureMergeResult> {
  const decisions: FixtureMergeDecision[] = [];
  let assetsUpserted = 0;
  let conflictsRaised = 0;

  // Load all existing fixtures for this project once
  const existingRows = await mergerDb.getAssetsByType(projectId, ASSET_TYPE);
  const existingMap = new Map(
    existingRows.map(r => [r.unitName ?? '', r]),
  );

  for (const unit of incoming) {
    const key = fixtureKey(unit.fixtureName);
    const incomingBodyHash = hashContent(unit.factoryBody);
    const incomingUnitHash = hashUnit(unit as unknown as Record<string, unknown>);
    const incomingContent = JSON.stringify(unit);

    const existingRow = existingMap.get(unit.fixtureName) ?? null;

    if (!existingRow) {
      // ── ADD ────────────────────────────────────────────────────────────────
      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    key,
        filePath:    FIXTURE_FILE,
        content:     incomingContent,
        contentHash: hashContent(incomingContent),
        unitName:    unit.fixtureName,
        unitHash:    incomingUnitHash,
        layer:       'fixture',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, incomingContent, hashContent(incomingContent),
        null, 'created', `Added via TC ${tcId}`,
      );

      decisions.push({ action: 'add', fixtureName: unit.fixtureName });
      assetsUpserted++;
      existingMap.set(unit.fixtureName, existingRow ?? { content: incomingContent, unitName: unit.fixtureName } as typeof existingRows[0]);
      continue;
    }

    const existingUnit = JSON.parse(existingRow.content) as FixtureUnit;
    const existingBodyHash = hashContent(existingUnit.factoryBody);

    if (existingBodyHash === incomingBodyHash) {
      // ── SKIP ───────────────────────────────────────────────────────────────
      decisions.push({ action: 'skip', fixtureName: unit.fixtureName });
      continue;
    }

    // Body differs — attempt parameterisation
    const parameterized = _attemptParameterize(existingUnit.factoryBody, unit.factoryBody);

    if (parameterized !== null) {
      // ── PARAMETERIZE ────────────────────────────────────────────────────────
      const paramUnit: FixtureUnit = {
        ...existingUnit,
        factoryBody: parameterized,
        sourceTcIds: [...existingUnit.sourceTcIds, ...unit.sourceTcIds],
      };
      const paramContent = JSON.stringify(paramUnit);
      const paramHash = hashContent(paramContent);

      await mergerDb.updateAsset(existingRow.id, {
        content:     paramContent,
        contentHash: paramHash,
        unitHash:    hashUnit(paramUnit as unknown as Record<string, unknown>),
        updatedBy:   null,
        changeNote:  `Parameterized to support both TC ${existingRow.sourceTcId} and TC ${tcId} values`,
      });

      await mergerDb.appendVersion(
        existingRow.id, paramContent, paramHash,
        null, 'updated', `Parameterized to merge values from TC ${tcId}`,
      );

      decisions.push({
        action: 'parameterize',
        fixtureName: unit.fixtureName,
        reason: 'Merged differing values into parameterized factory',
      });
      assetsUpserted++;
    } else {
      // ── NAMESPACE + CONFLICT ───────────────────────────────────────────────
      const namespacedName = `${unit.fixtureName}_${unit.scope.replace(/\W+/g, '_')}`;
      const namespacedKey = fixtureKey(namespacedName);
      const namespacedUnit: FixtureUnit = { ...unit, fixtureName: namespacedName };
      const namespacedContent = JSON.stringify(namespacedUnit);

      const assetId = await mergerDb.upsertAsset({
        projectId,
        assetType:   ASSET_TYPE,
        assetKey:    namespacedKey,
        filePath:    FIXTURE_FILE,
        content:     namespacedContent,
        contentHash: hashContent(namespacedContent),
        unitName:    namespacedName,
        unitHash:    incomingUnitHash,
        layer:       'fixture',
        sourceTcId:  tcId,
      });

      await mergerDb.appendVersion(
        assetId, namespacedContent, hashContent(namespacedContent),
        null, 'created', `Namespaced as ${namespacedName} due to collision with TC ${existingRow.sourceTcId}`,
      );

      const existingHash = existingRow.unitHash ?? hashUnit(existingUnit as unknown as Record<string, unknown>);
      await mergerDb.raiseConflict({
        projectId,
        assetType:       ASSET_TYPE,
        assetKey:        key,
        conflictType:    'fixture_collision',
        baseContent:     existingRow.content,
        incomingContent,
        baseTcId:        existingRow.sourceTcId ?? null,
        incomingTcId:    tcId,
        aiSuggestion:
          `Parameterization failed (too many differing lines). ` +
          `Incoming fixture stored as "${namespacedName}". ` +
          `Review and decide if they should be unified.`,
      });

      decisions.push({
        action: 'namespace',
        fixtureName: unit.fixtureName,
        reason: `Stored as "${namespacedName}", conflict raised for review`,
      });
      assetsUpserted++;
      conflictsRaised++;
    }
  }

  return { projectId, decisions, assetsUpserted, conflictsRaised };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parameterization helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to combine two fixture factory bodies into one parameterized version.
 *
 * Algorithm:
 *  1. Split both bodies line-by-line.
 *  2. Require same line count.
 *  3. Find differing lines — if >3, give up (return null).
 *  4. For each differing line, replace the literal value in bodyA with a
 *     function parameter (overrides?: Partial<T>) pattern.
 *
 * Returns the parameterized body string, or null if not possible.
 */
function _attemptParameterize(bodyA: string, bodyB: string): string | null {
  const linesA = bodyA.split('\n');
  const linesB = bodyB.split('\n');

  if (linesA.length !== linesB.length) return null;

  const diffIndexes: number[] = [];
  for (let i = 0; i < linesA.length; i++) {
    if (linesA[i] !== linesB[i]) diffIndexes.push(i);
  }

  if (diffIndexes.length === 0) return null; // identical — caller handles SKIP
  if (diffIndexes.length > 3) return null;   // too complex

  // Build parameterized lines using spread override pattern
  // Strategy: inject `overrides` param into the returned object literal
  // We detect if the body looks like `return { ... }` or `() => ({ ... })`
  // and insert overrides spread.
  const returnsObjectLiteral =
    bodyA.includes('return {') || bodyA.includes('=> ({') || bodyA.includes('=> {');

  if (!returnsObjectLiteral) return null;

  // Find the closing brace of the return object and insert `...overrides`
  const spreadLine = '  ...overrides,';

  // Insert spread before the closing brace of the last return object
  const closingBraceIdx = linesA.lastIndexOf('}');
  if (closingBraceIdx === -1) return null;

  // Check if spread is already present
  if (linesA.some(l => l.includes('...overrides'))) return null;

  const paramLines = [...linesA];
  paramLines.splice(closingBraceIdx, 0, spreadLine);

  // Wrap the whole thing to accept overrides param
  // Find the opening function signature line
  const fnSignatureIdx = paramLines.findIndex(
    l => l.includes('async') || l.includes('=>') || l.includes('function'),
  );

  if (fnSignatureIdx !== -1) {
    paramLines[fnSignatureIdx] = paramLines[fnSignatureIdx]
      .replace(/\(\)/, '(overrides: Record<string, unknown> = {})')
      .replace(/\((\w+)\)/, '($1, overrides: Record<string, unknown> = {})');
  }

  const result = paramLines.join('\n');

  // Sanity: result should be longer than either input
  if (result.length <= bodyA.length) return null;

  return result;
}
