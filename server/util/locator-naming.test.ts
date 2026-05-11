/**
 * D2 regression tests — locator-naming helpers
 *
 * Run:  npx tsx server/util/locator-naming.test.ts
 *
 * Test map:
 *   Test 1  — round-trip: getLocatorModuleId(pageClassName) is consistent between file emitter and import path
 *   Test 2  — getLocatorClassName produces correct names
 *   Test 3  — empty input rejection
 *   Test 4  — whitespace-only input rejection
 *   Test 5  — no literal '.locators' concatenations outside this file (lint guard)
 *   Test 6  — snapshot: canonical fixture import line ↔ emitter file path agree
 */

import * as assert from 'assert';
import * as fs   from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getLocatorModuleId, getLocatorClassName } from './locator-naming.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Test harness ──────────────────────────────────────────────────────────────

const results: { name: string; ok: boolean; error?: string }[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    results.push({ name, ok: false, error: e.message });
    console.error(`  ❌ ${name}\n     ${e.message}`);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively collect *.ts files under a directory (excludes node_modules / dist). */
function walkTs(dir: string): string[] {
  const SKIP = new Set(['node_modules', 'dist', 'playwright-report', '.autotest-tmp', '.auth']);
  const out: string[] = [];
  function visit(p: string): void {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name)) visit(path.join(p, entry.name));
      } else if (entry.name.endsWith('.ts')) {
        out.push(path.join(p, entry.name));
      }
    }
  }
  visit(dir);
  return out;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Test 1 — Round-trip consistency
 *
 * For each pageClassName, getLocatorModuleId must produce a stem S such that:
 *   - The locator-emitter writes `locators/${S}.ts`
 *   - The page-object import resolves to `locators/${S}.ts`
 *
 * Includes 'NousinfosystemsPagePage' to prove the double-Page case is handled
 * (old function produced 'NousinfosystemsPagePagePage.locators' — fails the assertion).
 *
 * This test FAILS on main (old function) and PASSES after the D2 fix.
 */
await test('Test 1: round-trip — getLocatorModuleId is consistent between emitter and import', () => {
  const pageClassNames = ['FooBarPage', 'NousinfosystemsPagePage', 'ContactUsPage', 'NousinfosystemsHomePage'];
  for (const className of pageClassNames) {
    const moduleId = getLocatorModuleId(className);

    // What the locator-file emitter writes
    const emittedFile = `locators/${moduleId}.ts`;

    // What the page-object import resolves to (@locators alias → locators/)
    const importSpec      = `@locators/${moduleId}`;
    const resolvedImport  = importSpec.replace('@locators/', 'locators/') + '.ts';

    assert.strictEqual(
      emittedFile,
      resolvedImport,
      `[${className}] emitter writes "${emittedFile}" but import resolves to "${resolvedImport}"`
    );

    // Canonical form: pageClassName + '.locators' (no extra 'Page' appended)
    assert.strictEqual(
      moduleId,
      `${className}.locators`,
      `[${className}] expected "${className}.locators" but got "${moduleId}"`
    );
  }
});

/**
 * Test 2 — getLocatorClassName produces correct names
 */
await test('Test 2: getLocatorClassName — correct export name for each page class', () => {
  const cases: Array<[string, string]> = [
    ['NousinfosystemsHomePage', 'NousinfosystemsHomePageLocators'],
    ['ContactUsPage',           'ContactUsPageLocators'],
    ['FooBarPage',              'FooBarPageLocators'],
    ['NousinfosystemsPagePage', 'NousinfosystemsPagePageLocators'],
  ];
  for (const [input, expected] of cases) {
    const actual = getLocatorClassName(input);
    assert.strictEqual(actual, expected, `[${input}] expected "${expected}" got "${actual}"`);
  }
});

/**
 * Test 3 — Empty string is rejected
 */
await test('Test 3: getLocatorModuleId("") throws', () => {
  assert.throws(
    () => getLocatorModuleId(''),
    /pageClassName is required/,
    'Expected throw for empty input'
  );
});

/**
 * Test 4 — Whitespace-only string is rejected
 */
await test('Test 4: getLocatorModuleId("   ") throws', () => {
  assert.throws(
    () => getLocatorModuleId('   '),
    /pageClassName is required/,
    'Expected throw for whitespace-only input'
  );
});

/**
 * Test 5 — Lint guard: no literal '.locators' string concatenations outside this helper.
 *
 * Scans all *.ts files under server/ and fails if any file (other than this one
 * and *.test.ts files) contains a string literal that ends with ".locators".
 *
 * This is the actual regression net for D2: any future PR that bypasses
 * getLocatorModuleId() turns this test red.
 */
await test('Test 5: no literal .locators paths outside locator-naming.ts (lint guard)', () => {
  const serverDir = path.join(__dirname, '..');  // server/
  const files = walkTs(serverDir);
  const violations: string[] = [];

  for (const f of files) {
    // Skip this file and all test files (they may contain literal examples)
    if (f.endsWith('locator-naming.ts') || f.endsWith('.test.ts')) continue;

    const content = fs.readFileSync(f, 'utf-8');

    // Look for string-literal tokens that end with .locators immediately before a closing quote.
    // Pattern: quote char, optional non-quote chars, '.locators', closing quote char.
    // This catches hardcoded paths like '@locators/FooPage.locators' or 'FooPage.locators'
    // but NOT runtime template expressions like `@locators/${getLocatorModuleId(name)}`.
    const matches = content.match(/['"`][^'"`]*\.locators['"`]/g);
    if (matches) {
      violations.push(`${path.relative(serverDir, f)}: ${matches.join(' | ')}`);
    }
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Found literal .locators paths outside locator-naming.ts:\n  ${violations.join('\n  ')}`
  );
});

/**
 * Test 6 — Snapshot: canonical fixture import line ↔ emitter file path agree.
 *
 * Reads the canonical-nousinfosystems.json fixture and verifies that:
 *   - The page class file imports from @locators/<moduleId>
 *   - The locators file is written to locators/<moduleId>.ts
 *   - Both <moduleId> values match (i.e. the fixture itself is consistent)
 */
await test('Test 6: canonical fixture — import path resolves to the locators file', () => {
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'recordings', 'canonical-nousinfosystems.json');

  if (!fs.existsSync(fixturePath)) {
    // Skip gracefully if fixture is absent (non-blocking)
    console.log('     (skipped — canonical fixture not found)');
    return;
  }

  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const files: Array<{ path: string; content: string }> = fixture.generatedFiles ?? [];

  // Find the page class file and the locators file
  const pageFile = files.find(f => f.path.startsWith('pages/') && f.path.endsWith('.ts'));
  const locFile  = files.find(f => f.path.startsWith('locators/') && f.path.endsWith('.ts'));

  assert.ok(pageFile,  'Fixture missing pages/*.ts entry');
  assert.ok(locFile,   'Fixture missing locators/*.ts entry');

  // Extract the locator module stem from the page file's import
  const importMatch = pageFile!.content.match(/from ['"]@locators\/([^'"]+)['"]/);
  assert.ok(importMatch, `pages file has no @locators import:\n${pageFile!.content.slice(0, 300)}`);

  const importedStem = importMatch![1];  // e.g. NousinfosystemsHomePage.locators

  // The locators file path should be locators/<importedStem>.ts
  const expectedLocatorFile = `locators/${importedStem}.ts`;
  assert.strictEqual(
    locFile!.path,
    expectedLocatorFile,
    `Page imports @locators/${importedStem} but locator file is at ${locFile!.path}`
  );
});

// ─── Results ───────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);
if (failed > 0) {
  console.error('Some locator-naming tests FAILED ❌');
  process.exit(1);
}
console.log('All locator-naming tests passed ✅');
process.exit(0);
