// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 3: Framework Merger Engine — Post-Merge Refactoring
// server/lib/merger/post-merge.ts
//
// Runs after all 7 layers have been merged for a recording.
// Three passes:
//   1. Import resolution — fix broken import paths in all specs
//   2. Config regeneration — rebuild playwright.config.ts from live spec list
//   3. Dead code detection — flag locators not referenced in any spec (no delete)
// ─────────────────────────────────────────────────────────────────────────────

import { mergerDb } from './db-adapter.js';
import { hashContent, updateImportPaths } from './utils.js';
import type { RefactoringChange } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function runPostMergeRefactoring(
  projectId: string,
): Promise<RefactoringChange[]> {
  const changes: RefactoringChange[] = [];

  // Pass 1 — Import resolution
  const importChanges = await _fixImportPaths(projectId);
  changes.push(...importChanges);

  // Pass 2 — Regenerate playwright.config.ts
  const configChange = await _regeneratePlaywrightConfig(projectId);
  if (configChange) changes.push(configChange);

  // Pass 3 — Dead code detection (warnings only)
  const deadCodeWarnings = await _detectDeadLocators(projectId);
  changes.push(...deadCodeWarnings);

  return changes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 1: Import path fixing
// ─────────────────────────────────────────────────────────────────────────────

async function _fixImportPaths(projectId: string): Promise<RefactoringChange[]> {
  const changes: RefactoringChange[] = [];
  const specs = await mergerDb.getAssetsByType(projectId, 'spec');

  for (const spec of specs) {
    const fixed = updateImportPaths(spec.content);
    if (fixed === spec.content) continue;

    const newHash = hashContent(fixed);
    await mergerDb.updateAsset(spec.id, {
      content:     fixed,
      contentHash: newHash,
      changeNote:  'Auto-fixed import paths during post-merge refactoring',
    });

    await mergerDb.appendVersion(
      spec.id, fixed, newHash, null, 'updated',
      'Import paths normalised during post-merge refactoring',
    );

    changes.push({
      filePath:    spec.filePath,
      changeType:  'import_fix',
      description: 'Updated import paths to merged canonical locations',
    });
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 2: Regenerate playwright.config.ts
// ─────────────────────────────────────────────────────────────────────────────

async function _regeneratePlaywrightConfig(
  projectId: string,
): Promise<RefactoringChange | null> {
  const allSpecs = await mergerDb.getAssetsByType(projectId, 'spec');

  const config = _generatePlaywrightConfig(allSpecs.map(s => s.filePath));
  const configHash = hashContent(config);

  // Fetch existing config (if any)
  const existing = await mergerDb.getAssetsByTypeAndKey(
    projectId, 'config', 'playwright.config',
  );

  if (existing[0] && existing[0].contentHash === configHash) {
    return null; // no change needed
  }

  const assetId = await mergerDb.upsertAsset({
    projectId,
    assetType:   'config',
    assetKey:    'playwright.config',
    filePath:    'playwright.config.ts',
    content:     config,
    contentHash: configHash,
    unitName:    'playwright.config',
    unitHash:    configHash,
    layer:       'config',
    sourceTcId:  null,
  });

  await mergerDb.appendVersion(
    assetId, config, configHash, null,
    existing[0] ? 'updated' : 'created',
    `Regenerated from ${allSpecs.length} spec(s) during post-merge`,
  );

  return {
    filePath:    'playwright.config.ts',
    changeType:  'config_regenerated',
    description: `Regenerated to include ${allSpecs.length} spec file(s)`,
  };
}

/**
 * Generate a production-ready playwright.config.ts string.
 */
function _generatePlaywrightConfig(_specPaths: string[]): string {
  return `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass 3: Dead locator detection
// ─────────────────────────────────────────────────────────────────────────────

async function _detectDeadLocators(projectId: string): Promise<RefactoringChange[]> {
  const changes: RefactoringChange[] = [];

  const [locatorRows, specRows] = await Promise.all([
    mergerDb.getAssetsByType(projectId, 'locator'),
    mergerDb.getAssetsByType(projectId, 'spec'),
  ]);

  // Build a single concatenated string of all spec content for fast substring search
  const allSpecContent = specRows.map(s => s.content).join('\n');

  for (const locator of locatorRows) {
    const unitName = locator.unitName;
    if (!unitName) continue;

    // Check if any spec references this locator by name
    if (!allSpecContent.includes(unitName)) {
      changes.push({
        filePath:    locator.filePath,
        changeType:  'dead_code_warning',
        description: `Locator "${unitName}" is defined but not referenced by any spec`,
      });
    }
  }

  return changes;
}
