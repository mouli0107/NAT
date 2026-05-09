// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 3: Framework Merger Engine — ZIP Builder
// server/lib/merger/zip-builder.ts
//
// Assembles a downloadable Playwright test framework ZIP from DB assets.
// Scope options: 'project' | 'module' | 'feature' | 'selected'
// ─────────────────────────────────────────────────────────────────────────────

import archiver from 'archiver';
import { mergerDb } from './db-adapter.js';
import type { FrameworkAsset } from '@shared/schema';

// ── Shared asset types always included regardless of scope ────────────────────
const SHARED_ASSET_TYPES = ['config', 'fixture', 'generic_util'];

// ── All standard asset types (scope-filterable) ───────────────────────────────
const SCOPE_ASSET_TYPES = ['locator', 'page_object_method', 'action_step', 'business_function', 'spec'];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ZipOptions {
  scope: 'project' | 'module' | 'feature' | 'selected';
  /** For scope='module': the moduleName (e.g. "Login") */
  scopeId?: string;
  /** For scope='selected': list of TC sequence IDs (e.g. ["TC-001", "TC-002"]) */
  selectedTcIds?: string[];
  projectName: string;
}

/**
 * Build a ZIP buffer containing the full test framework for the requested scope.
 * Always includes shared layers (config, fixtures, generic utils).
 */
export async function buildProjectZip(
  projectId: string,
  options: ZipOptions,
): Promise<Buffer> {
  // Fetch scope-specific assets
  const scopedAssets = await _getScopedAssets(projectId, options);

  // Always include shared layers
  const sharedAssets = await mergerDb.getAssetsByTypes(projectId, SHARED_ASSET_TYPES);

  // Merge + deduplicate (shared always wins on key collision)
  const allAssets = _deduplicateAssets([...scopedAssets, ...sharedAssets]);

  const folderName =
    `${options.projectName.replace(/[^\w-]+/g, '-')}-TestSuite-` +
    `${new Date().toISOString().split('T')[0]}`;

  return _buildZipBuffer(folderName, allAssets, options.projectName);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope filtering
// ─────────────────────────────────────────────────────────────────────────────

async function _getScopedAssets(
  projectId: string,
  options: ZipOptions,
): Promise<FrameworkAsset[]> {
  // For 'project' scope — return all framework assets
  if (options.scope === 'project') {
    return mergerDb.getAssetsByTypes(projectId, SCOPE_ASSET_TYPES);
  }

  // For module/feature/selected — fetch all then filter
  const all = await mergerDb.getAssetsByTypes(projectId, SCOPE_ASSET_TYPES);

  if (options.scope === 'module' && options.scopeId) {
    const modulePrefix = `tests/${options.scopeId}/`;
    return all.filter(
      a => a.assetType !== 'spec' || a.filePath.startsWith(modulePrefix),
    );
  }

  if (options.scope === 'feature' && options.scopeId) {
    // scopeId = "Login/HappyPath"
    const featurePrefix = `tests/${options.scopeId}/`;
    return all.filter(
      a => a.assetType !== 'spec' || a.filePath.startsWith(featurePrefix),
    );
  }

  if (options.scope === 'selected' && options.selectedTcIds?.length) {
    const selected = new Set(options.selectedTcIds);
    return all.filter(
      a => a.assetType !== 'spec' || (a.assetKey && selected.has(a.assetKey)),
    );
  }

  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication
// ─────────────────────────────────────────────────────────────────────────────

function _deduplicateAssets(assets: FrameworkAsset[]): FrameworkAsset[] {
  // Last-write-wins by filePath (shared assets inserted last take precedence)
  const byFilePath = new Map<string, FrameworkAsset>();
  for (const asset of assets) {
    byFilePath.set(asset.filePath, asset);
  }
  return Array.from(byFilePath.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP assembly
// ─────────────────────────────────────────────────────────────────────────────

function _buildZipBuffer(
  folderName: string,
  assets: FrameworkAsset[],
  projectName: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.on('warning', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    // ── Framework assets at their canonical paths ──────────────────────────
    for (const asset of assets) {
      // Content stored as JSON for unit assets — write raw for spec/config files
      const fileContent = _resolveAssetContent(asset);
      archive.append(fileContent, {
        name: `${folderName}/${asset.filePath}`,
      });
    }

    // ── Generated meta files ───────────────────────────────────────────────
    archive.append(
      _generatePackageJson(projectName),
      { name: `${folderName}/package.json` },
    );

    archive.append(
      _generateEnvExample(),
      { name: `${folderName}/.env.example` },
    );

    archive.append(
      _generateReadme(projectName, assets),
      { name: `${folderName}/README.md` },
    );

    archive.append(
      _generateTsConfig(),
      { name: `${folderName}/tsconfig.json` },
    );

    archive.finalize();
  });
}

/**
 * Resolve the content to write to disk for a given asset.
 * - Spec / config assets: content is already a raw TS string
 * - Unit assets (locator, page_object_method, action_step, business_function,
 *   generic_util, fixture): content is JSON → extract the functionBody / body / selector
 */
function _resolveAssetContent(asset: FrameworkAsset): string {
  const rawTypes = new Set(['spec', 'config', 'bdd_feature', 'bdd_steps', 'pom']);

  if (rawTypes.has(asset.assetType)) {
    return asset.content;
  }

  // JSON-stored unit — extract the code field based on type
  try {
    const parsed = JSON.parse(asset.content) as Record<string, unknown>;
    const code =
      (parsed['functionBody'] as string | undefined) ??
      (parsed['body'] as string | undefined) ??
      (parsed['factoryBody'] as string | undefined) ??
      asset.content; // fallback to raw if no known field

    return code;
  } catch {
    return asset.content;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated file templates
// ─────────────────────────────────────────────────────────────────────────────

function _generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/[^\w-]+/g, '-'),
      version: '1.0.0',
      description: `Playwright test suite — ${projectName}`,
      scripts: {
        test: 'playwright test',
        'test:headed': 'playwright test --headed',
        'test:report': 'playwright show-report',
        'install:browsers': 'playwright install chromium',
      },
      devDependencies: {
        '@playwright/test': '^1.44.0',
        typescript: '^5.4.0',
      },
    },
    null,
    2,
  );
}

function _generateEnvExample(): string {
  return [
    '# Copy to .env and fill in your application URL',
    'BASE_URL=https://your-app.example.com',
    '',
    '# Optional: credentials for test accounts',
    '# TEST_USER_EMAIL=test@example.com',
    '# TEST_USER_PASSWORD=changeme',
  ].join('\n');
}

function _generateReadme(projectName: string, assets: FrameworkAsset[]): string {
  const specCount = assets.filter(a => a.assetType === 'spec').length;
  const locatorCount = assets.filter(a => a.assetType === 'locator').length;

  return [
    `# ${projectName} — Playwright Test Suite`,
    '',
    `Generated by **NAT 2.0 ASTRA** on ${new Date().toLocaleDateString()}.`,
    '',
    '## Quick Start',
    '',
    '```bash',
    'npm install',
    'npx playwright install chromium',
    'cp .env.example .env',
    '# Edit .env with your application URL',
    'npx playwright test',
    '```',
    '',
    '## Suite Contents',
    '',
    `- **${specCount}** test cases`,
    `- **${locatorCount}** locator units`,
    '- Full 5-layer Page Object Model framework',
    '- Shared utilities, fixtures, and business actions',
    '',
    '## Running Specific Tests',
    '',
    '```bash',
    'npx playwright test tests/login/       # run a module',
    'npx playwright test --grep "TC-001"    # run one TC',
    'npx playwright test --headed           # visible browser',
    'npx playwright test --reporter=html    # HTML report',
    '```',
    '',
    '## Framework Structure',
    '',
    '```',
    'locators/    ← Playwright selectors (one file per page)',
    'pages/       ← Page Object Model classes',
    'actions/     ← Business action workflows',
    'fixtures/    ← Test fixtures and data factories',
    'utils/       ← Shared utility functions',
    'tests/       ← Spec files (module/feature/TC-NNN.spec.ts)',
    '```',
  ].join('\n');
}

function _generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        outDir: './dist',
        baseUrl: '.',
        paths: {
          '@pages/*': ['pages/*'],
          '@actions/*': ['actions/*'],
          '@locators/*': ['locators/*'],
          '@utils/*': ['utils/*'],
          '@fixtures/*': ['fixtures/*'],
        },
      },
      include: ['**/*.ts'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2,
  );
}
