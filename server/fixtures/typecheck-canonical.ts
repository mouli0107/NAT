/**
 * C1 — generate-and-typecheck
 * ─────────────────────────────────────────────────────────────────────────────
 * Assembles the canonical nousinfosystems.com generated project in a temp
 * directory and runs `tsc --noEmit` on it.  No Claude API key is needed —
 * static template constants are imported directly from the generator module
 * and the AI-generated portions are read from the committed JSON fixture.
 *
 * Exit codes:
 *   0  — tsc passed (all files type-check)
 *   1  — tsc reported errors (build will be red until generator bugs are fixed)
 *   2  — script setup error (bad fixture JSON, npm install failure, etc.)
 *
 * Usage:
 *   npx tsx server/fixtures/typecheck-canonical.ts
 *
 * CI:
 *   See .github/workflows/astra-tests.yml — the "generate-and-typecheck" step.
 *   The temp directory path is printed on failure so it can be captured as an
 *   artifact for debugging.
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as os   from 'os';
import { fileURLToPath } from 'url';
import { spawnSync }     from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Import static template constants from the generator ───────────────────────
// These are the exact strings written into every generated project.
// Using the live constants means this test stays in sync automatically when
// any generic file is updated.
import {
  GENERIC_BROWSER_ACTIONS,
  GENERIC_FORM_ACTIONS,
  GENERIC_ASSERT_ACTIONS,
  HELPERS_UNIVERSAL,
  EXCEL_READER_FILE,
  PACKAGE_JSON,
  TSCONFIG_JSON,
} from '../script-writer-agent.js';

// ── Load the canonical fixture ────────────────────────────────────────────────
const fixturePath = path.join(__dirname, 'recordings', 'canonical-nousinfosystems.json');

if (!fs.existsSync(fixturePath)) {
  console.error(`[typecheck-canonical] Fixture not found: ${fixturePath}`);
  process.exit(2);
}

interface CanonicalFile { path: string; type: string; content: string; }
interface CanonicalFixture { generatedFiles: CanonicalFile[]; }

const fixture: CanonicalFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

// ── Assemble the full file set ─────────────────────────────────────────────────
// Static files come from the generator constants; AI-generated files from the fixture.
const staticFiles: CanonicalFile[] = [
  { path: 'actions/generic/browser.actions.ts', type: 'generic_action', content: GENERIC_BROWSER_ACTIONS },
  { path: 'actions/generic/form.actions.ts',    type: 'generic_action', content: GENERIC_FORM_ACTIONS    },
  { path: 'actions/generic/assert.actions.ts',  type: 'generic_action', content: GENERIC_ASSERT_ACTIONS  },
  { path: 'helpers/universal.ts',               type: 'generic_action', content: HELPERS_UNIVERSAL       },
  { path: 'fixtures/excel-reader.ts',           type: 'config',         content: EXCEL_READER_FILE       },
  { path: 'package.json',                       type: 'config',         content: PACKAGE_JSON            },
  { path: 'tsconfig.json',                      type: 'config',         content: TSCONFIG_JSON           },
];

// Merge: static files first, then fixture AI-generated files (fixture wins on collision)
const fileMap = new Map<string, string>();
for (const f of staticFiles)                { fileMap.set(f.path, f.content); }
for (const f of fixture.generatedFiles)     { fileMap.set(f.path, f.content); }

// ── Write to a temp directory ─────────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nat20-canonical-'));
console.log(`[typecheck-canonical] Writing ${fileMap.size} files to ${tmpDir}`);

for (const [filePath, content] of fileMap) {
  const dest = path.join(tmpDir, filePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

// ── npm install (skip Playwright browser download and other postinstall scripts) ─
console.log('[typecheck-canonical] Running npm install --ignore-scripts...');
const npmInstall = spawnSync(
  'npm', ['install', '--ignore-scripts', '--prefer-offline'],
  {
    cwd: tmpDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
    },
  }
);

if (npmInstall.status !== 0) {
  console.error(`[typecheck-canonical] npm install failed (exit ${npmInstall.status})`);
  console.error(`[typecheck-canonical] Temp dir preserved for debugging: ${tmpDir}`);
  process.exit(2);
}

// ── tsc --noEmit ──────────────────────────────────────────────────────────────
console.log('[typecheck-canonical] Running npx tsc --noEmit...');
const tsc = spawnSync(
  'npx', ['tsc', '--noEmit'],
  {
    cwd: tmpDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }
);

if (tsc.status !== 0) {
  console.error(`\n[typecheck-canonical] TypeScript errors found in generated project.`);
  console.error(`[typecheck-canonical] Temp dir for inspection: ${tmpDir}`);
  // Print file listing to help CI artifacts
  console.error('[typecheck-canonical] Files written:');
  for (const [p] of fileMap) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[typecheck-canonical] ✓ All files type-check cleanly.');
// Clean up on success
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(0);
