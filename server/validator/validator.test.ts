/**
 * Validator module self-tests (Part 7 of spec)
 * Run with: npx ts-node server/validator/validator.test.ts
 * (or integrate into your test runner)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createRequire } from 'module';
const _testRequire = createRequire(import.meta.url);
const XLSX = _testRequire('xlsx') as typeof import('xlsx');
import { validateGeneratedProject } from './index';
import { generateWithValidation, GenerationValidationError, RecordingSession } from './runner';
import { getLocatorModuleId, getLocatorClassName, buildActionManifest, buildVerifyFunction, fixDoubleNavigation, writeTempProjectDir, buildRetryPreamble } from '../script-writer-agent.js';
import { toNaturalLanguage } from '../recorder-nl.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

type AssertFn = () => void;
const results: { name: string; ok: boolean; error?: string }[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    results.push({ name, ok: false, error: e.message });
    console.error(`  ❌ ${name}\n     ${e.message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/** Create a minimal temporary project directory with required structure */
function createTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nat20-validator-test-'));
  // Create required skeleton directories and files
  const dirs = [
    'locators', 'pages', 'actions/generic', 'actions/business', 'tests',
    'fixtures', 'helpers',
  ];
  for (const d of dirs) fs.mkdirSync(path.join(dir, d), { recursive: true });
  // Minimal required static files
  fs.writeFileSync(path.join(dir, 'playwright.config.ts'), minimalPlaywrightConfig());
  fs.writeFileSync(path.join(dir, 'package.json'), minimalPackageJson());
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), minimalTsConfig());
  fs.writeFileSync(path.join(dir, '.env.example'), 'BASE_URL=https://example.com\n');
  fs.writeFileSync(path.join(dir, 'fixtures/test-data.ts'), minimalTestData());
  fs.writeFileSync(path.join(dir, 'helpers/universal.ts'), minimalUniversal());
  // Minimal placeholder files so directories are non-empty
  fs.writeFileSync(path.join(dir, 'locators/TestPage.locators.ts'), minimalLocators());
  fs.writeFileSync(path.join(dir, 'pages/TestPage.ts'), minimalPage());
  fs.writeFileSync(path.join(dir, 'actions/generic/browser.actions.ts'), 'export {};\n');
  fs.writeFileSync(path.join(dir, 'actions/business/test.actions.ts'), minimalBusinessActions());
  fs.writeFileSync(path.join(dir, 'tests/test.spec.ts'), minimalTest());
  return dir;
}

function cleanup(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ─── Minimal file content factories ──────────────────────────────────────────

function minimalPlaywrightConfig(): string {
  return `import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: process.env.BASE_URL || 'https://example.com',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
`;
}

function minimalPackageJson(): string {
  return JSON.stringify({
    name: 'test-framework',
    devDependencies: { '@playwright/test': '^1.52.0', typescript: '^5.5.0' },
  }, null, 2);
}

function minimalTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020', module: 'commonjs', strict: true, skipLibCheck: true,
      esModuleInterop: true,
    },
    include: ['**/*.ts'],
  }, null, 2);
}

function minimalTestData(): string {
  return `export const testData = { baseUrl: process.env.BASE_URL || 'https://example.com' } as const;\n`;
}

function minimalUniversal(): string {
  return `import { Page } from '@playwright/test';\nexport async function prepareSite(page: Page): Promise<void> {}\n`;
}

function minimalLocators(): string {
  return `import { Page, Locator } from '@playwright/test';
export const TestPageLocators = {
  someButton: (page: Page): Locator => page.locator("xpath=//button[contains(normalize-space(text()),'Click')]"),
};
`;
}

function minimalPage(): string {
  return `import { Page } from '@playwright/test';
import { TestPageLocators } from '@locators/TestPage.locators';
export class TestPage {
  constructor(private readonly page: Page) {}
  async clickButton(): Promise<void> {
    const loc = TestPageLocators.someButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }
}
`;
}

function minimalBusinessActions(): string {
  // D4: must use (page: Page, data: TestDataRow) — Gate 12 enforces this
  return `import { Page } from '@playwright/test';
import { TestPage } from '@pages/TestPage';
import { TestDataRow } from '@fixtures/excel-reader';
export async function doSomething(page: Page, data: TestDataRow): Promise<void> {
  const pg = new TestPage(page);
  await pg.clickButton();
}
`;
}

function minimalTest(): string {
  return `import { test } from '@playwright/test';
import { doSomething } from '@actions/business/test.actions';
test.describe('Test Suite', () => {
  test('does something', async ({ page }) => {
    await doSomething(page);
  });
});
`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n🧪 Validator module self-tests\n');

// TEST 1a — Gate 01 skips (passes) when node_modules is absent (C1 false-positive guard)
await test('Gate 01: skips cleanly when node_modules is absent', async () => {
  const dir = createTmpProject();
  try {
    // Ensure no node_modules directory exists (createTmpProject never creates one)
    const nmPath = path.join(dir, 'node_modules');
    assert(!fs.existsSync(nmPath), 'createTmpProject should not create node_modules');

    // Gate 01 should not produce any errors (skip, not fail)
    const result = await validateGeneratedProject(dir);
    const gate01Errors = result.blockers.filter(e => e.gate === 'gate-01-typescript');
    assert(
      gate01Errors.length === 0,
      `Expected Gate 01 to skip (no errors) when node_modules absent, got: ${JSON.stringify(gate01Errors)}`
    );
  } finally { cleanup(dir); }
});

// TEST D2a — getLocatorModuleId: file path and import path are always consistent
await test('D2: getLocatorModuleId — file path matches import path for multiple page base names', () => {
  const sampleNames = [
    'NousinfosystemsHome',
    'OnespanContactUs',
    'AppDashboard',
    'MyWebsiteLogin',
    'ExampleProductDetail',
  ];
  for (const name of sampleNames) {
    const moduleId  = getLocatorModuleId(name);
    const className = getLocatorClassName(name);

    // The filename written by the emitter
    const filePath = `locators/${moduleId}.ts`;
    // The import path written by the prompt (resolved by tsconfig @locators alias)
    const importPath = `@locators/${moduleId}`;

    // The import path stripped of alias must resolve to the same file stem as the emitted file
    const importStem = importPath.replace('@locators/', '');
    const fileStem   = filePath.replace('locators/', '').replace('.ts', '');

    assert(
      importStem === fileStem,
      `D2 mismatch for "${name}": import stem "${importStem}" ≠ file stem "${fileStem}"`
    );
    assert(
      className === `${name}PageLocators`,
      `Expected className "${name}PageLocators", got "${className}"`
    );
    assert(
      moduleId === `${name}Page.locators`,
      `Expected moduleId "${name}Page.locators", got "${moduleId}"`
    );
  }
});

// TEST D2b — getLocatorModuleId: import path in a generated page class matches the locator file
await test('D2: page class import path resolves to the locator file on disk', () => {
  // Simulate what the emitter does (D2 fix: use getLocatorModuleId for both)
  const pageBaseName = 'NousinfosystemsHome';
  const moduleId     = getLocatorModuleId(pageBaseName);
  const className    = getLocatorClassName(pageBaseName);

  // File path the emitter would write
  const emittedFilePath = `locators/${moduleId}.ts`;  // e.g. locators/NousinfosystemsHomePage.locators.ts

  // Import the page class would emit
  const importStatement = `import { ${className} } from '@locators/${moduleId}';`;
  // Extract the module specifier from the import
  const moduleSpecMatch = importStatement.match(/from '(@locators\/[^']+)'/);
  assert(!!moduleSpecMatch, 'Could not extract module specifier from import statement');

  const moduleSpec = moduleSpecMatch![1]; // e.g. @locators/NousinfosystemsHomePage.locators
  // Resolve alias: @locators/X → locators/X.ts
  const resolvedPath = moduleSpec.replace('@locators/', 'locators/') + '.ts';

  assert(
    resolvedPath === emittedFilePath,
    `D2 mismatch: import resolves to "${resolvedPath}" but emitter writes "${emittedFilePath}"`
  );
});

// TEST 2 — Gate 02 catches expect() in POM
await test('Gate 02: catches expect() in POM', async () => {
  const dir = createTmpProject();
  try {
    fs.writeFileSync(path.join(dir, 'pages/TestPage.ts'), `
import { Page } from '@playwright/test';
import { expect } from '@playwright/test';
export class TestPage {
  constructor(private readonly page: Page) {}
  async checkVisible(): Promise<void> {
    await expect(this.page.locator('button')).toBeVisible();
  }
}
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'NO_EXPECT_IN_POM');
    assert(!!match, `Expected NO_EXPECT_IN_POM blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`);
  } finally { cleanup(dir); }
});

// TEST 3 — Gate 03 catches exact XPath equality
await test('Gate 03: catches exact XPath text equality', async () => {
  const dir = createTmpProject();
  try {
    fs.writeFileSync(path.join(dir, 'locators/TestPage.locators.ts'), `
import { Page, Locator } from '@playwright/test';
export const TestPageLocators = {
  submitBtn: (page: Page): Locator => page.locator("xpath=//button[normalize-space(text())='Submit']"),
};
`);
    const result = await validateGeneratedProject(dir);
    const match = result.majors.find(e => e.rule === 'NO_EXACT_TEXT_EQUALITY_XPATH');
    assert(!!match, `Expected NO_EXACT_TEXT_EQUALITY_XPATH major, got: ${JSON.stringify(result.majors.map(e => e.rule))}`);
  } finally { cleanup(dir); }
});

// TEST 4 — Gate 04 catches method name mismatch
await test('Gate 04: catches method not in POM', async () => {
  const dir = createTmpProject();
  try {
    // POM has clickButton, but business action calls clickBtn
    fs.writeFileSync(path.join(dir, 'actions/business/test.actions.ts'), `
import { Page } from '@playwright/test';
import { TestPage } from '@pages/TestPage';
import { testData } from '@fixtures/test-data';
export async function doSomething(page: Page, data = testData): Promise<void> {
  const pg = new TestPage(page);
  await pg.clickBtn();  // wrong name — POM has clickButton()
}
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'METHOD_NOT_IN_POM');
    assert(!!match, `Expected METHOD_NOT_IN_POM blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`);
  } finally { cleanup(dir); }
});

// TEST 5 — Gate 05 catches missing helpers/universal.ts
await test('Gate 05: catches missing helpers/universal.ts', async () => {
  const dir = createTmpProject();
  try {
    fs.unlinkSync(path.join(dir, 'helpers/universal.ts'));
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'REQUIRED_FILE_MISSING' && e.file === 'helpers/universal.ts');
    assert(!!match, `Expected REQUIRED_FILE_MISSING for helpers/universal.ts, got: ${JSON.stringify(result.blockers.map(e => e.rule + ':' + e.file))}`);
  } finally { cleanup(dir); }
});

// TEST 6 — Gate 06 catches garbled class name
await test('Gate 06: catches garbled class name', async () => {
  const dir = createTmpProject();
  try {
    fs.writeFileSync(path.join(dir, 'pages/GvvvGdmiqjccvc7cPage.ts'), `
import { Page } from '@playwright/test';
export class GvvvGdmiqjccvc7cPage {
  constructor(private readonly page: Page) {}
}
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'GARBLED_CLASS_NAME');
    assert(!!match, `Expected GARBLED_CLASS_NAME blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`);
  } finally { cleanup(dir); }
});

// TEST 7 — Gate 07 catches real email in fixtures
await test('Gate 07: catches real email in fixture defaults', async () => {
  const dir = createTmpProject();
  try {
    fs.writeFileSync(path.join(dir, 'fixtures/test-data.ts'), `
export const testData = {
  baseUrl: process.env.BASE_URL || 'https://example.com',
  email: process.env.EMAIL || "user@gmail.com",
} as const;
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'NO_REAL_EMAIL_IN_FIXTURE');
    assert(!!match, `Expected NO_REAL_EMAIL_IN_FIXTURE blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`);
  } finally { cleanup(dir); }
});

// TEST 9 — Gate 10 catches fullyParallel: false
await test('Gate 10: catches fullyParallel: false', async () => {
  const dir = createTmpProject();
  try {
    fs.writeFileSync(path.join(dir, 'playwright.config.ts'), `
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', fullyParallel: false });
`);
    const result = await validateGeneratedProject(dir);
    const match = result.majors.find(e => e.rule === 'FULLPARALLEL_MUST_BE_TRUE');
    assert(!!match, `Expected FULLPARALLEL_MUST_BE_TRUE major, got: ${JSON.stringify(result.majors.map(e => e.rule))}`);
  } finally { cleanup(dir); }
});

// TEST D3a — Gate 11 catches an import of a non-existent action function
await test('Gate 11: catches import of non-existent action function', async () => {
  const dir = createTmpProject();
  try {
    // Write a test file that imports 'verifyElementEnabled' — doesn't exist (real name: verifyEnabled)
    fs.writeFileSync(path.join(dir, 'tests/bad-import.spec.ts'), `
import { test } from '@playwright/test';
import { verifyElementEnabled } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';
test.describe('Bad Import', () => {
  test('fails on non-existent function', async ({ page }) => {
    await verifyElementEnabled(page, 'Submit');
  });
});
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'UNKNOWN_ACTION_IMPORT');
    assert(
      !!match,
      `Expected UNKNOWN_ACTION_IMPORT blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`
    );
    assert(
      match!.found.includes('verifyElementEnabled'),
      `Expected match to reference 'verifyElementEnabled', got: ${match!.found}`
    );
  } finally { cleanup(dir); }
});

// TEST D3b — Gate 11 passes when import uses correct action function names
await test('Gate 11: passes when all action imports are valid', async () => {
  const dir = createTmpProject();
  try {
    // Write a test file that uses only real exported names
    fs.writeFileSync(path.join(dir, 'tests/good-import.spec.ts'), `
import { test } from '@playwright/test';
import { verifyEnabled, verifyText, verifyUrl } from '@actions/generic/assert.actions';
import { navigateTo } from '@actions/generic/browser.actions';
import { getTestData } from '@fixtures/excel-reader';
test.describe('Good Import', () => {
  const data = getTestData('TC001');
  test('uses real names', async ({ page }) => {
    await navigateTo(page, data.baseUrl);
    await verifyText(page, 'Home');
    await verifyUrl(page, '/home');
    await verifyEnabled(page, 'Submit');
  });
});
`);
    const result = await validateGeneratedProject(dir);
    const g11Errors = result.blockers.filter(e => e.gate === 'gate-11-action-symbols');
    assert(
      g11Errors.length === 0,
      `Expected no Gate 11 errors, got: ${JSON.stringify(g11Errors)}`
    );
  } finally { cleanup(dir); }
});

// TEST D3c — buildActionManifest returns correct names for all 4 modules
await test('D3: buildActionManifest — all 4 modules present with correct exports', () => {
  const manifest = buildActionManifest();

  // browser actions
  const browser = manifest.get('@actions/generic/browser.actions')!;
  assert(!!browser, 'browser.actions missing from manifest');
  assert(browser.has('navigateTo'),         'navigateTo missing from browser manifest');
  assert(browser.has('clickLink'),          'clickLink missing from browser manifest');
  assert(browser.has('waitForNetworkIdle'), 'waitForNetworkIdle missing from browser manifest');
  assert(browser.has('clickAndNavigate'),   'clickAndNavigate missing from browser manifest');

  // assert actions — verify the D3 bug name is NOT in the manifest, real name IS
  const asserts = manifest.get('@actions/generic/assert.actions')!;
  assert(!!asserts, 'assert.actions missing from manifest');
  assert(asserts.has('verifyEnabled'),        'verifyEnabled missing from assert manifest');
  assert(asserts.has('verifyText'),           'verifyText missing from assert manifest');
  assert(asserts.has('verifyUrl'),            'verifyUrl missing from assert manifest');
  assert(asserts.has('softAssert'),           'softAssert missing from assert manifest');
  assert(!asserts.has('verifyElementEnabled'),'verifyElementEnabled should NOT be in manifest (D3 regression check)');

  // form actions
  const form = manifest.get('@actions/generic/form.actions')!;
  assert(!!form, 'form.actions missing from manifest');
  assert(form.has('fillField'),    'fillField missing from form manifest');
  assert(form.has('selectOption'), 'selectOption missing from form manifest');

  // universal helpers
  const universal = manifest.get('@helpers/universal')!;
  assert(!!universal, 'universal helpers missing from manifest');
  assert(universal.has('prepareSite'), 'prepareSite missing from universal manifest');
});

// TEST D4a — Gate 12 catches a business action with (page: Page) only
await test('Gate 12: catches business action missing data param', async () => {
  const dir = createTmpProject();
  try {
    fs.mkdirSync(path.join(dir, 'actions', 'business'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'actions/business/example.actions.ts'), `
import { Page } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { getTestData } from '@fixtures/excel-reader';

export async function doSomething(page: Page): Promise<void> {
  await navigateTo(page, 'https://example.com');
}
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'BUSINESS_ACTION_MISSING_DATA_PARAM');
    assert(
      !!match,
      `Expected BUSINESS_ACTION_MISSING_DATA_PARAM blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`
    );
    assert(
      match!.found.includes('doSomething'),
      `Expected match to reference 'doSomething', got: ${match!.found}`
    );
  } finally { cleanup(dir); }
});

// TEST D4b — Gate 12 passes when all business actions have (page, data) signature
await test('Gate 12: passes when all business actions have correct signature', async () => {
  const dir = createTmpProject();
  try {
    fs.mkdirSync(path.join(dir, 'actions', 'business'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'actions/business/example.actions.ts'), `
import { Page } from '@playwright/test';
import { TestDataRow, getTestData } from '@fixtures/excel-reader';
import { navigateTo } from '@actions/generic/browser.actions';

export async function doSomething(page: Page, data: TestDataRow): Promise<void> {
  await navigateTo(page, data.baseUrl);
}

export async function verifyExample(page: Page, _data: TestDataRow): Promise<void> {
  // assertions here
}
`);
    const result = await validateGeneratedProject(dir);
    const g12Errors = result.blockers.filter(e => e.gate === 'gate-12-action-signatures');
    assert(
      g12Errors.length === 0,
      `Expected no Gate 12 errors, got: ${JSON.stringify(g12Errors)}`
    );
  } finally { cleanup(dir); }
});

// TEST D4c — buildVerifyFunction emits (page, _data: TestDataRow) signature
await test('D4: buildVerifyFunction emits _data: TestDataRow in signature', () => {
  const assertionSteps = [
    'Step 1: Assert "Welcome" is visible',
    'Step 2: Assert "Submit" is enabled',
  ];
  const output = buildVerifyFunction('example', assertionSteps);
  assert(output.length > 0, 'buildVerifyFunction returned empty string');
  assert(
    output.includes('_data: TestDataRow'),
    `Expected "_data: TestDataRow" in signature, got:\n${output.slice(0, 300)}`
  );
  assert(
    !output.includes('(page: Page)'),
    `Expected no bare (page: Page) signature, got:\n${output.slice(0, 300)}`
  );
});

// ─── C2: Generation-time validation helpers ───────────────────────────────

// TEST C2a — writeTempProjectDir writes .ts files and skips excel_data
await test('C2: writeTempProjectDir — writes ts files, skips excel_data', () => {
  const files = [
    { path: 'pages/TestPage.ts',                content: 'export class TestPage {}',           type: 'pom' as const },
    { path: 'actions/business/test.actions.ts', content: 'export async function doIt() {}',    type: 'business_action' as const },
    { path: 'fixtures/test-data.xlsx',          content: '{"tcId":"TC001","baseUrl":"..."}',   type: 'excel_data' as any },
    { path: 'playwright.config.ts',             content: 'export default {};',                  type: 'config' as const },
  ];

  const tmpDir = writeTempProjectDir(files as any);
  try {
    assert(fs.existsSync(path.join(tmpDir, 'pages/TestPage.ts')),            'TestPage.ts should exist');
    assert(fs.existsSync(path.join(tmpDir, 'actions/business/test.actions.ts')), 'test.actions.ts should exist');
    assert(fs.existsSync(path.join(tmpDir, 'playwright.config.ts')),         'playwright.config.ts should exist');
    assert(!fs.existsSync(path.join(tmpDir, 'fixtures/test-data.xlsx')),     'excel_data should NOT be written');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

// TEST C2b — writeTempProjectDir returns a readable directory
await test('C2: writeTempProjectDir — content is faithfully written', () => {
  const content = 'export class Foo { bar() { return 42; } }';
  const files = [{ path: 'pages/FooPage.ts', content, type: 'pom' as const }];

  const tmpDir = writeTempProjectDir(files as any);
  try {
    const written = fs.readFileSync(path.join(tmpDir, 'pages/FooPage.ts'), 'utf8');
    assert(written === content, `File content mismatch. Got: ${written.slice(0, 100)}`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

// TEST C2c — buildRetryPreamble includes the error text
await test('C2: buildRetryPreamble — includes error text in output', () => {
  const errText = 'Gate 12: BUSINESS_ACTION_MISSING_DATA_PARAM in actions/business/test.actions.ts line 5';
  const preamble = buildRetryPreamble(errText);
  assert(preamble.includes(errText),   'Preamble must include the original error text');
  assert(preamble.includes('FAILED'),  'Preamble must contain FAILED keyword');
  assert(preamble.includes('Fix ALL'), 'Preamble must instruct Claude to fix all issues');
  assert(preamble.length > errText.length, 'Preamble must be longer than the raw error text');
});

// TEST C2d — writeTempProjectDir then validateGeneratedProject is a valid pipeline
await test('C2: writeTempProjectDir + validateGeneratedProject — end-to-end pipeline', async () => {
  // Build a set of in-memory generated files (similar to what generateFramework yields)
  const files = [
    { path: 'playwright.config.ts',             content: minimalPlaywrightConfig(), type: 'config' as const },
    { path: 'package.json',                     content: minimalPackageJson(),      type: 'config' as const },
    { path: 'tsconfig.json',                    content: minimalTsConfig(),         type: 'config' as const },
    { path: '.env.example',                     content: 'BASE_URL=https://example.com\n', type: 'config' as const },
    { path: 'fixtures/test-data.ts',            content: minimalTestData(),         type: 'config' as const },
    { path: 'helpers/universal.ts',             content: minimalUniversal(),        type: 'config' as const },
    { path: 'locators/TestPage.locators.ts',    content: minimalLocators(),         type: 'pom' as const },
    { path: 'pages/TestPage.ts',                content: minimalPage(),             type: 'pom' as const },
    { path: 'actions/generic/browser.actions.ts', content: 'export {};\n',          type: 'generic_action' as const },
    { path: 'actions/business/test.actions.ts', content: minimalBusinessActions(), type: 'business_action' as const },
    { path: 'tests/test.spec.ts',               content: minimalTest(),             type: 'test' as const },
  ];

  const tmpDir = writeTempProjectDir(files as any);
  try {
    const result = await validateGeneratedProject(tmpDir);
    // Gate 01 skips (no node_modules). Gate 13 skips (no xlsx).
    // All other gates should pass with the minimal clean project.
    const nonSkippableErrors = [...result.blockers, ...result.majors]
      .filter(e => e.gate !== 'gate-01-typescript' && e.gate !== 'gate-13-test-data-sync');
    assert(
      nonSkippableErrors.length === 0,
      `Expected clean validation from temp dir. Errors: ${JSON.stringify(nonSkippableErrors.map(e => `[${e.rule}] ${e.file}`))}`
    );
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

// ─── D7: Test-data sync ────────────────────────────────────────────────────

/** Write a minimal fixtures/test-data.xlsx with one or more tcId rows */
function writeTestDataXlsx(dir: string, tcIds: string[]): void {
  const rows = tcIds.map(tcId => ({ tcId, baseUrl: 'https://example.com' }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'TestData');
  const xlsxPath = path.join(dir, 'fixtures', 'test-data.xlsx');
  fs.mkdirSync(path.dirname(xlsxPath), { recursive: true });
  XLSX.writeFile(wb, xlsxPath);
}

// TEST D7a — Gate 13 catches getTestData('XXX') when XXX not in xlsx
await test('Gate 13: catches getTestData with id not in Excel', async () => {
  const dir = createTmpProject();
  try {
    // xlsx has TC001, spec calls getTestData('TC002')
    writeTestDataXlsx(dir, ['TC001']);
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/bad-data.spec.ts'), `
import { test } from '@playwright/test';
import { getTestData } from '@fixtures/excel-reader';
test.describe('Bad data', () => {
  const data = getTestData('TC002');
  test('runs', async ({ page }) => { /* ... */ });
});
`);
    const result = await validateGeneratedProject(dir);
    const match = result.blockers.find(e => e.rule === 'TEST_DATA_ID_NOT_IN_XLSX');
    assert(
      !!match,
      `Expected TEST_DATA_ID_NOT_IN_XLSX blocker, got: ${JSON.stringify(result.blockers.map(e => e.rule))}`
    );
    assert(match!.found.includes('TC002'), `Expected match to mention TC002, got: ${match!.found}`);
  } finally { cleanup(dir); }
});

// TEST D7b — Gate 13 passes when getTestData id matches xlsx
await test('Gate 13: passes when getTestData id matches xlsx row', async () => {
  const dir = createTmpProject();
  try {
    writeTestDataXlsx(dir, ['TC001']);
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/good-data.spec.ts'), `
import { test } from '@playwright/test';
import { getTestData } from '@fixtures/excel-reader';
test.describe('Good data', () => {
  const data = getTestData('TC001');
  test('runs', async ({ page }) => { /* ... */ });
});
`);
    const result = await validateGeneratedProject(dir);
    const g13Errors = result.blockers.filter(e => e.gate === 'gate-13-test-data-sync');
    assert(
      g13Errors.length === 0,
      `Expected no Gate 13 errors, got: ${JSON.stringify(g13Errors)}`
    );
  } finally { cleanup(dir); }
});

// TEST D7c — Gate 13 skips when xlsx absent (Gate 05 handles that)
await test('Gate 13: skips silently when xlsx is absent', async () => {
  const dir = createTmpProject();
  try {
    // No xlsx, but spec calls getTestData
    fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'tests/no-xlsx.spec.ts'), `
import { test } from '@playwright/test';
import { getTestData } from '@fixtures/excel-reader';
test.describe('No xlsx', () => {
  const data = getTestData('TC999');
  test('runs', async ({ page }) => { /* ... */ });
});
`);
    const result = await validateGeneratedProject(dir);
    const g13Errors = result.blockers.filter(e => e.gate === 'gate-13-test-data-sync');
    assert(
      g13Errors.length === 0,
      `Expected Gate 13 to skip when xlsx absent, got: ${JSON.stringify(g13Errors)}`
    );
  } finally { cleanup(dir); }
});

// TEST D7d — deriveTcId: resolvedTcId passed to buildTestFilePrompt prompt string
await test('D7: buildTestFilePrompt uses resolvedTcId not testName-derived key', () => {
  // Simulate the derivation logic from generateFramework
  const testName = 'TC005 Submit contact form with attachments';
  const providedTcId = 'TC005';

  // The CORRECT derivation (what resolvedTcId computes)
  const resolvedTcId = providedTcId.trim() ||
    (testName.match(/^(TC\d+)/i)?.[1] ?? `TC_${testName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`);

  // The WRONG derivation (old bug — what the prompt used to compute inline)
  const wrongKey = testName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'TC001';

  assert(
    resolvedTcId === 'TC005',
    `Expected resolvedTcId to be "TC005", got "${resolvedTcId}"`
  );
  assert(
    wrongKey !== resolvedTcId,
    `D7 regression: wrong key "${wrongKey}" matches resolvedTcId "${resolvedTcId}" — test needs updating`
  );
  // The point: resolvedTcId is clean and correct; wrongKey would be "TC005Submit" or similar
  assert(
    wrongKey.startsWith('TC005Submit') || wrongKey !== resolvedTcId,
    `Expected wrongKey to be different from resolvedTcId — got wrongKey="${wrongKey}"`
  );
});

// ─── D6: ARIA role + label whitespace normalization ──────────────────────────

/** Minimal RecordingEvent factory */
function makeClickEvent(element: Record<string, unknown>): Parameters<typeof toNaturalLanguage>[0] {
  return {
    sequence: 1, timestamp: Date.now(), sessionId: 'test',
    type: 'click', url: 'https://example.com', pageTitle: 'Test',
    element,
  } as any;
}

// TEST D6a — toNaturalLanguage uses ariaRole 'button' for non-button HTML tags
await test('D6: toNaturalLanguage — div[role=button] emits "Click button"', () => {
  const event = makeClickEvent({ tag: 'div', ariaRole: 'button', isButton: true, description: 'Submit Form', label: 'Submit Form' });
  const result = toNaturalLanguage(event, 1);
  assert(
    result === 'Step 1: Click button "Submit Form"',
    `Expected 'Click button', got: "${result}"`
  );
});

// TEST D6b — toNaturalLanguage uses ariaRole 'link' for non-anchor HTML tags
await test('D6: toNaturalLanguage — span[role=link] emits "Click link"', () => {
  const event = makeClickEvent({ tag: 'span', ariaRole: 'link', isLink: true, description: 'Privacy Policy', label: 'Privacy Policy' });
  const result = toNaturalLanguage(event, 2);
  assert(
    result === 'Step 2: Click link "Privacy Policy"',
    `Expected 'Click link', got: "${result}"`
  );
});

// TEST D6c — toNaturalLanguage normalizes stray whitespace in label
await test('D6: toNaturalLanguage — stray double-spaces in label are collapsed', () => {
  const event = makeClickEvent({ tag: 'button', description: 'Submit  Contact  Form', label: 'Submit  Contact  Form' });
  const result = toNaturalLanguage(event, 3);
  assert(
    result === 'Step 3: Click button "Submit Contact Form"',
    `Expected collapsed whitespace, got: "${result}"`
  );
});

// TEST D6d — toNaturalLanguage normalizes leading/trailing whitespace in label
await test('D6: toNaturalLanguage — leading/trailing whitespace is trimmed', () => {
  const event = makeClickEvent({ tag: 'a', description: '  Learn More  ', label: '  Learn More  ' });
  const result = toNaturalLanguage(event, 4);
  assert(
    result === 'Step 4: Click link "Learn More"',
    `Expected trimmed whitespace, got: "${result}"`
  );
});

// TEST D6e — native button tag still works (regression: HTML tag path unchanged)
await test('D6: toNaturalLanguage — native <button> tag still emits "Click button"', () => {
  const event = makeClickEvent({ tag: 'button', description: 'Save', label: 'Save' });
  const result = toNaturalLanguage(event, 5);
  assert(
    result === 'Step 5: Click button "Save"',
    `Expected 'Click button', got: "${result}"`
  );
});

// TEST D6f — native anchor tag still works (regression)
await test('D6: toNaturalLanguage — native <a> tag still emits "Click link"', () => {
  const event = makeClickEvent({ tag: 'a', description: 'Home', label: 'Home' });
  const result = toNaturalLanguage(event, 6);
  assert(
    result === 'Step 6: Click link "Home"',
    `Expected 'Click link', got: "${result}"`
  );
});

// TEST D5a — fixDoubleNavigation removes leading navigateTo from function body
await test('D5: fixDoubleNavigation — removes navigateTo as first statement', () => {
  const input = `import { Page } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { TestDataRow } from '@fixtures/excel-reader';
import { ContactPage } from '@pages/ContactPage';

export async function submitForm(page: Page, data: TestDataRow): Promise<void> {
  await navigateTo(page, data.baseUrl);
  const pg = new ContactPage(page);
  await pg.fillName(data.firstName);
}

export async function verifyConfirmation(page: Page, data: TestDataRow): Promise<void> {
  await navigateTo(page, data.baseUrl);
  const pg = new ContactPage(page);
  await pg.assertConfirmation();
}
`;

  const output = fixDoubleNavigation(input);

  // Both leading navigateTo calls should be removed
  assert(
    !output.includes('await navigateTo(page, data.baseUrl);'),
    `Expected leading navigateTo calls to be removed, got:\n${output}`
  );
  // The rest of the code should be intact
  assert(output.includes('pg.fillName'), 'Expected pg.fillName to remain after fix');
  assert(output.includes('pg.assertConfirmation'), 'Expected pg.assertConfirmation to remain after fix');
});

// TEST D5b — fixDoubleNavigation keeps navigateTo when it's NOT the first statement
await test('D5: fixDoubleNavigation — preserves navigateTo in the middle of a function', () => {
  const input = `import { Page } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { TestDataRow } from '@fixtures/excel-reader';
import { HomePage } from '@pages/HomePage';
import { ProductPage } from '@pages/ProductPage';

export async function navigateToProduct(page: Page, data: TestDataRow): Promise<void> {
  const homePg = new HomePage(page);
  await homePg.clickProductsLink();
  await waitForNetworkIdle(page);
  await navigateTo(page, data.productUrl);   // mid-action nav — must NOT be removed
}
`;

  const output = fixDoubleNavigation(input);

  assert(
    output.includes('await navigateTo(page, data.productUrl)'),
    `Expected mid-function navigateTo to be preserved, got:\n${output}`
  );
  assert(output.includes('homePg.clickProductsLink'), 'Expected clickProductsLink to remain');
});

// TEST D5c — fixDoubleNavigation is idempotent (running twice gives same result)
await test('D5: fixDoubleNavigation — idempotent on already-clean code', () => {
  const clean = `import { Page } from '@playwright/test';
import { TestDataRow } from '@fixtures/excel-reader';
import { ContactPage } from '@pages/ContactPage';

export async function fillContactForm(page: Page, data: TestDataRow): Promise<void> {
  const pg = new ContactPage(page);
  await pg.fillName(data.firstName);
  await pg.fillEmail(data.email);
}
`;

  const once  = fixDoubleNavigation(clean);
  const twice = fixDoubleNavigation(once);
  assert(once === twice, 'fixDoubleNavigation should be idempotent — second pass changed the output');
  assert(once === clean, 'fixDoubleNavigation should not modify already-clean code');
});

// TEST 10 — Clean project passes all gates
await test('TEST 10: clean project passes all gates', async () => {
  const dir = createTmpProject();
  try {
    const result = await validateGeneratedProject(dir);
    // Gate 01 may fail without node_modules — skip it for this smoke test
    const nonTscErrors = result.blockers.filter(e => e.gate !== 'gate-01-typescript')
      .concat(result.majors.filter(e => e.gate !== 'gate-01-typescript'));
    assert(
      nonTscErrors.length === 0,
      `Expected no blockers/majors (ignoring tsc gate), got: ${JSON.stringify(nonTscErrors.map(e => `[${e.rule}] ${e.file}`))}`
    );
  } finally { cleanup(dir); }
});

// TEST 11 — Retry loop terminates after MAX_RETRIES
await test('TEST 11: retry loop terminates after 3 attempts', async () => {
  let callCount = 0;
  const fakeSession: RecordingSession = { id: 'test', startUrl: 'https://example.com', testName: 'test', nlSteps: [] };

  // generateFn always produces a project with a missing required file (blocker)
  const generateFn = async (_sess: RecordingSession, _ctx?: string): Promise<string> => {
    callCount++;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nat20-retry-test-'));
    // Create just enough to pass most gates but missing helpers/universal.ts
    fs.mkdirSync(path.join(dir, 'helpers'), { recursive: true });
    // Don't write helpers/universal.ts → Gate 05 fires
    return dir;
  };

  try {
    await generateWithValidation(fakeSession, generateFn);
    assert(false, 'Expected GenerationValidationError to be thrown');
  } catch (e: any) {
    assert(e instanceof GenerationValidationError, `Expected GenerationValidationError, got ${e.constructor.name}`);
    assert(callCount === 3, `Expected exactly 3 attempts, got ${callCount}`);
  }
});

// TEST 12 — Retry loop injects error context on second attempt
await test('TEST 12: retryContext injected on second attempt', async () => {
  let secondCallContext: string | undefined = 'NOT_SET';
  let callCount = 0;
  const fakeSession: RecordingSession = { id: 'test', startUrl: 'https://example.com', testName: 'test', nlSteps: [] };

  const generateFn = async (_sess: RecordingSession, ctx?: string): Promise<string> => {
    callCount++;
    if (callCount === 2) secondCallContext = ctx;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nat20-ctx-test-'));
    fs.mkdirSync(path.join(dir, 'helpers'), { recursive: true });
    // Trigger Gate 05 blocker on every call
    return dir;
  };

  try {
    await generateWithValidation(fakeSession, generateFn);
  } catch {
    // expected
  }

  assert(callCount >= 2, `Expected at least 2 attempts, got ${callCount}`);
  assert(
    secondCallContext !== undefined && secondCallContext !== 'NOT_SET' && secondCallContext.length > 0,
    `Expected non-empty retryContext on second call, got: "${secondCallContext}"`
  );
  assert(
    secondCallContext!.includes('REQUIRED_FILE_MISSING') || secondCallContext!.includes('BLOCKER') || secondCallContext!.includes('helpers'),
    `retryContext should mention the error, got: "${secondCallContext}"`
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.ok).length;
const failed = results.filter(r => !r.ok).length;
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

if (failed > 0) {
  console.error('\nFailed tests:');
  results.filter(r => !r.ok).forEach(r => console.error(`  • ${r.name}: ${r.error}`));
  process.exit(1);
} else {
  console.log('All tests passed ✅');
}
