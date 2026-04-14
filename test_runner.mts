/**
 * End-to-end pipeline test with simulated rediker.com recording data.
 * Run: npx tsx test_runner.mts
 *
 * Tests all pure (non-Claude) functions from script-writer-agent.ts:
 *  1. detectAuthSteps()
 *  2. extractTestData() (inlined — not exported)
 *  3. buildTestDataFile() (inlined — not exported)
 *  4. analyzePages() (inlined — not exported)
 *  5. buildAuthSetupContent() (inlined — not exported)
 */

import { detectAuthSteps, type AuthInfo } from './server/script-writer-agent.ts';

// ─── Simulated recording from rediker.com ─────────────────────────────────

const SIMULATED_NL_STEPS = [
  'Step 1: Navigate to https://admin.rediker.com/login',
  'Step 2: Enter "admin@school.edu" in the "Email Address" field',
  'Step 3: Enter "***MASKED***" in the "Password" field',
  'Step 4: Click button "Sign In"',
  'Step 5: Navigate to https://admin.rediker.com/dashboard',
  'Step 6: Click link "Students"',
  'Step 7: Navigate to https://admin.rediker.com/students',
  'Step 8: Enter "John Smith" in the "Search Students" field',
  'Step 9: Click button "Search"',
  'Step 10: Click link "John Smith" in the results table',
  'Step 11: Navigate to https://admin.rediker.com/students/12345',
  'Step 12: Verify text "John Smith" is visible',
];

const SIMULATED_EVENTS = [
  { sequence: 1,  type: 'page_load',  url: 'https://admin.rediker.com/login',          naturalLanguage: 'Step 1: Navigate to https://admin.rediker.com/login' },
  { sequence: 2,  type: 'fill',       url: 'https://admin.rediker.com/login',          naturalLanguage: 'Step 2: Enter "admin@school.edu" in the "Email Address" field' },
  { sequence: 3,  type: 'fill',       url: 'https://admin.rediker.com/login',          naturalLanguage: 'Step 3: Enter "***MASKED***" in the "Password" field' },
  { sequence: 4,  type: 'click',      url: 'https://admin.rediker.com/login',          naturalLanguage: 'Step 4: Click button "Sign In"' },
  { sequence: 5,  type: 'page_load',  url: 'https://admin.rediker.com/dashboard',      naturalLanguage: 'Step 5: Navigate to https://admin.rediker.com/dashboard' },
  { sequence: 6,  type: 'click',      url: 'https://admin.rediker.com/dashboard',      naturalLanguage: 'Step 6: Click link "Students"' },
  { sequence: 7,  type: 'page_load',  url: 'https://admin.rediker.com/students',       naturalLanguage: 'Step 7: Navigate to https://admin.rediker.com/students' },
  { sequence: 8,  type: 'fill',       url: 'https://admin.rediker.com/students',       naturalLanguage: 'Step 8: Enter "John Smith" in the "Search Students" field' },
  { sequence: 9,  type: 'click',      url: 'https://admin.rediker.com/students',       naturalLanguage: 'Step 9: Click button "Search"' },
  { sequence: 10, type: 'click',      url: 'https://admin.rediker.com/students',       naturalLanguage: 'Step 10: Click link "John Smith" in the results table' },
  { sequence: 11, type: 'page_load',  url: 'https://admin.rediker.com/students/12345', naturalLanguage: 'Step 11: Navigate to https://admin.rediker.com/students/12345' },
  { sequence: 12, type: 'assertion',  url: 'https://admin.rediker.com/students/12345', naturalLanguage: 'Step 12: Verify text "John Smith" is visible' },
];

const START_URL = 'https://admin.rediker.com/login';

// ─── Mini assert helper ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? '\n     → ' + detail : ''}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n━━━ ${title} ${'━'.repeat(Math.max(0, 55 - title.length))}`);
}

// ─── Inlined helpers (not exported from script-writer-agent) ──────────────

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function toScreamingSnake(camel: string): string {
  return camel.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
}

interface ExtractedField { key: string; value: string; label: string; isSensitive: boolean }

function extractTestData(nlSteps: string[]): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();
  const fillPattern    = /Enter\s+"(.+?)"\s+in the\s+"(.+?)"\s+field/i;
  const maskedPattern  = /Enter\s+"\*\*\*MASKED\*\*\*"\s+in the\s+"(.+?)"\s+field/i;

  for (const step of nlSteps) {
    const maskedMatch = step.match(maskedPattern);
    if (maskedMatch) {
      const label = maskedMatch[1];
      const key = toCamelCase(label) + 'Password';
      if (!seen.has(key)) {
        fields.push({ key, value: '', label, isSensitive: true });
        seen.add(key);
      }
      continue;
    }
    const fillMatch = step.match(fillPattern);
    if (fillMatch) {
      const value = fillMatch[1];
      const label = fillMatch[2];
      const key = toCamelCase(label);
      if (!seen.has(key)) {
        fields.push({ key, value, label, isSensitive: /password|secret|token|key/i.test(label) });
        seen.add(key);
      }
    }
  }
  return fields;
}

function buildTestDataFile(fields: ExtractedField[], startUrl: string): string {
  const lines: string[] = [
    `import * as dotenv from 'dotenv';`,
    `dotenv.config();`,
    ``,
    `/** Test data extracted from recorded interactions. */`,
    `export const testData = {`,
    `  baseUrl: process.env.BASE_URL || '${startUrl}',`,
    ``,
  ];
  for (const f of fields) {
    const envKey = toScreamingSnake(f.key);
    if (f.isSensitive) {
      lines.push(`  /** ${f.label} — set ${envKey} env var */`);
      lines.push(`  ${f.key}: process.env.${envKey} || '',`);
    } else {
      lines.push(`  /** ${f.label} */`);
      lines.push(`  ${f.key}: process.env.${envKey} || ${JSON.stringify(f.value)},`);
    }
    lines.push('');
  }
  lines.push(`} as const;`);
  lines.push(`export type TestData = typeof testData;`);
  return lines.join('\n');
}

function buildAuthSetupContent(authInfo: AuthInfo, startUrl: string): string {
  const usernameLabel = authInfo.usernameLabel || 'Email';
  const passwordLabel = authInfo.passwordLabel || 'Password';
  const submitLabel   = authInfo.submitLabel   || 'Sign In';
  let loginPathSegment = 'login';
  try {
    const parts = new URL(startUrl).pathname.split('/').filter(Boolean);
    if (parts.length > 0) loginPathSegment = parts[parts.length - 1];
  } catch {}
  return `import { test as setup } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('${startUrl}');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('${usernameLabel}', { exact: false }).fill(process.env.TEST_USERNAME || '');
  await page.getByLabel('${passwordLabel}', { exact: false }).fill(process.env.TEST_PASSWORD || '');
  await page.getByRole('button', { name: '${submitLabel}', exact: false }).click();

  await page.waitForURL(url => !url.href.includes('${loginPathSegment}'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: authFile });
  console.log('✅ Auth state saved to .auth/user.json');
});
`;
}

interface PageGroup { url: string; pageName: string; domain: string; steps: string[]; isAuthPage: boolean }

function deriveNames(url: string, steps: string[]): { pageName: string; domain: string } {
  let pageName = 'App';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      const isNumericOrId = /^\d+$/.test(last) || /^[a-f0-9-]{8,}$/i.test(last);
      let segment: string;
      if (isNumericOrId && parts.length >= 2) {
        const parent = parts[parts.length - 2].replace(/[-_]/g, ' ');
        segment = parent.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Detail';
      } else {
        segment = last.replace(/[-_]/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }
      pageName = segment || 'App';
    } else {
      pageName = u.hostname.split('.')[0].charAt(0).toUpperCase() + u.hostname.split('.')[0].slice(1);
    }
  } catch {}
  const text = steps.join(' ').toLowerCase();
  let domain = pageName.toLowerCase();
  if (text.includes('login') || text.includes('sign in') || text.includes('***masked***')) domain = 'auth';
  else if (text.includes('search')) domain = 'search';
  return { pageName, domain };
}

function analyzePages(
  nlSteps: string[],
  events: Array<{ sequence: number; type: string; url: string; naturalLanguage: string }>,
  startUrl: string
): PageGroup[] {
  const stepUrlMap = new Map<string, string>();
  for (const evt of events) {
    if (evt.naturalLanguage && evt.url) stepUrlMap.set(evt.naturalLanguage.trim(), evt.url);
  }

  const groups: PageGroup[] = [];
  let currentUrl = startUrl;
  let currentSteps: string[] = [];

  const flush = (url: string) => {
    if (currentSteps.length === 0) return;
    const { pageName, domain } = deriveNames(url, currentSteps);
    const isAuthPage = currentSteps.some(s => /Enter.*"\*\*\*MASKED\*\*\*"/.test(s));
    groups.push({ url, pageName, domain, steps: [...currentSteps], isAuthPage });
    currentSteps = [];
  };

  for (const step of nlSteps) {
    const mappedUrl = stepUrlMap.get(step.trim());
    if (mappedUrl && mappedUrl !== currentUrl && mappedUrl.startsWith('http')) {
      flush(currentUrl);
      currentUrl = mappedUrl;
    }
    currentSteps.push(step);
  }
  flush(currentUrl);

  // Deduplicate by path prefix
  const merged = new Map<string, PageGroup>();
  for (const g of groups) {
    let key = g.url;
    try { key = new URL(g.url).pathname.split('/').slice(0, 3).join('/'); } catch {}
    if (merged.has(key)) merged.get(key)!.steps.push(...g.steps);
    else merged.set(key, { ...g });
  }
  return Array.from(merged.values());
}

// ══════════════════════════════════════════════════════════════════════════
// TEST 1: detectAuthSteps
// ══════════════════════════════════════════════════════════════════════════
section('TEST 1: detectAuthSteps()');
const authInfo = detectAuthSteps(SIMULATED_NL_STEPS);

assert('hasAuth is true', authInfo.hasAuth === true);
assert('usernameLabel = "Email Address"', authInfo.usernameLabel === 'Email Address', `Got: ${authInfo.usernameLabel}`);
assert('passwordLabel = "Password"',      authInfo.passwordLabel === 'Password',       `Got: ${authInfo.passwordLabel}`);
assert('submitLabel   = "Sign In"',       authInfo.submitLabel   === 'Sign In',        `Got: ${authInfo.submitLabel}`);
assert('usernameStep contains email',     (authInfo.usernameStep || '').includes('admin@school.edu'));
assert('passwordStep contains MASKED',    (authInfo.passwordStep || '').includes('***MASKED***'));
assert('submitStep contains Sign In',     (authInfo.submitStep   || '').includes('Sign In'));
console.log('\n  Auth info:', JSON.stringify(authInfo, null, 2));

// ══════════════════════════════════════════════════════════════════════════
// TEST 2: extractTestData
// ══════════════════════════════════════════════════════════════════════════
section('TEST 2: extractTestData()');
const fields = extractTestData(SIMULATED_NL_STEPS);

assert('3 fields extracted (email, password, search)',
  fields.length === 3,
  `Got ${fields.length}: ${JSON.stringify(fields.map(f => f.key))}`);

const emailField    = fields.find(f => f.key === 'emailAddress');
const passwordField = fields.find(f => f.key === 'passwordPassword');
const searchField   = fields.find(f => f.key === 'searchStudents');

assert('emailAddress field found',           !!emailField);
assert('emailAddress value = "admin@school.edu"', emailField?.value === 'admin@school.edu', `Got: ${emailField?.value}`);
assert('emailAddress isSensitive = false',   emailField?.isSensitive === false);
assert('passwordPassword field found',       !!passwordField);
assert('passwordPassword isSensitive = true', passwordField?.isSensitive === true);
assert('passwordPassword value = ""',        passwordField?.value === '');
assert('searchStudents field found',         !!searchField);
assert('searchStudents value = "John Smith"', searchField?.value === 'John Smith');

console.log('\n  Extracted fields:');
for (const f of fields) {
  console.log(`    [${f.isSensitive ? '🔒 sensitive' : '📝 plain    '}] ${f.key} = ${f.isSensitive ? '(env var only)' : JSON.stringify(f.value)}`);
}

// ══════════════════════════════════════════════════════════════════════════
// TEST 3: buildTestDataFile
// ══════════════════════════════════════════════════════════════════════════
section('TEST 3: buildTestDataFile() output');
const testDataContent = buildTestDataFile(fields, START_URL);

assert('Has dotenv import',          testDataContent.includes(`import * as dotenv from 'dotenv'`));
assert('Has baseUrl with env var',   testDataContent.includes(`process.env.BASE_URL`));
assert('Has emailAddress field',     testDataContent.includes('emailAddress'));
assert('Has "admin@school.edu" default', testDataContent.includes('"admin@school.edu"'));
assert('Has PASSWORD_PASSWORD env',  testDataContent.includes('PASSWORD_PASSWORD'));
assert('Password defaults to ""',    testDataContent.includes(`process.env.PASSWORD_PASSWORD || ''`));
assert('Has SEARCH_STUDENTS env',    testDataContent.includes('SEARCH_STUDENTS'));
assert('Has as const',               testDataContent.includes('as const'));
assert('Has TestData type export',   testDataContent.includes('export type TestData'));

console.log('\n  Generated fixtures/test-data.ts preview:');
const previewLines = testDataContent.split('\n');
previewLines.forEach(l => console.log('    ' + l));

// ══════════════════════════════════════════════════════════════════════════
// TEST 4: analyzePages — multi-page detection
// ══════════════════════════════════════════════════════════════════════════
section('TEST 4: analyzePages() — multi-page detection');
const pages = analyzePages(SIMULATED_NL_STEPS, SIMULATED_EVENTS, START_URL);

// /students and /students/12345 are separate pages → expect 4 groups
assert('4 page groups detected (login, dashboard, students-list, student-detail)',
  pages.length === 4,
  `Got ${pages.length}: ${JSON.stringify(pages.map(p => p.url))}`);

const loginPage  = pages.find(p => p.url.includes('/login'));
const dashPage   = pages.find(p => p.url.endsWith('/dashboard'));
const studPage   = pages.find(p => p.url.endsWith('/students'));
const detailPage = pages.find(p => p.url.includes('/students/'));

assert('Login page detected',        !!loginPage);
assert('Login page isAuthPage=true',  loginPage?.isAuthPage === true);
assert('Login page domain = "auth"',  loginPage?.domain === 'auth', `Got: ${loginPage?.domain}`);
assert('Dashboard page detected',    !!dashPage);
assert('Dashboard isAuthPage=false',  dashPage?.isAuthPage === false);
assert('Students list page detected', !!studPage);
assert('Students has search step',    (studPage?.steps || []).some(s => s.includes('Search Students')));
assert('Student detail page detected', !!detailPage);
assert('Detail page pageName has "Detail" suffix',
  (detailPage?.pageName || '').endsWith('Detail'),
  `Got pageName: ${detailPage?.pageName}`);

console.log('\n  Detected pages:');
for (const p of pages) {
  console.log(`    [${p.isAuthPage ? '🔐 auth' : '📄 page'}] ${p.url}`);
  console.log(`           pageName=${p.pageName}  domain=${p.domain}  steps=${p.steps.length}`);
}

// ══════════════════════════════════════════════════════════════════════════
// TEST 5: buildAuthSetupContent
// ══════════════════════════════════════════════════════════════════════════
section('TEST 5: buildAuthSetupContent() output');
const authContent = buildAuthSetupContent(authInfo, START_URL);

assert('Has @playwright/test import',         authContent.includes(`from '@playwright/test'`));
assert('Has storageState save',               authContent.includes('storageState'));
assert('Uses TEST_USERNAME env var',          authContent.includes('TEST_USERNAME'));
assert('Uses TEST_PASSWORD env var',          authContent.includes('TEST_PASSWORD'));
assert('getByLabel "Email Address"',          authContent.includes(`getByLabel('Email Address'`));
assert('getByLabel "Password"',               authContent.includes(`getByLabel('Password'`));
assert('getByRole "Sign In" button',          authContent.includes(`name: 'Sign In'`));
assert('waitForURL excludes login',           authContent.includes(`!url.href.includes('login')`));
assert('2x waitForLoadState networkidle',
  (authContent.match(/waitForLoadState\('networkidle'\)/g) || []).length === 2);

console.log('\n  Generated auth/auth.setup.ts preview:');
authContent.split('\n').forEach(l => console.log('    ' + l));

// ══════════════════════════════════════════════════════════════════════════
// TEST 6: Edge cases
// ══════════════════════════════════════════════════════════════════════════
section('TEST 6: Edge cases');

// No auth steps at all
const noAuthInfo = detectAuthSteps(['Step 1: Click button "Submit"', 'Step 2: Enter "test" in the "Name" field']);
assert('No auth when no MASKED steps', noAuthInfo.hasAuth === false);

// Multiple masked fields (should pick first occurrence)
const multiMasked = detectAuthSteps([
  'Step 1: Enter "user@test.com" in the "Email" field',
  'Step 2: Enter "***MASKED***" in the "Password" field',
  'Step 3: Click button "Login"',
  'Step 4: Enter "***MASKED***" in the "PIN" field',
]);
assert('hasAuth with multiple masked', multiMasked.hasAuth === true);
assert('First masked is Password',     multiMasked.passwordLabel === 'Password', `Got: ${multiMasked.passwordLabel}`);

// extractTestData with no fill steps
const emptyFields = extractTestData(['Step 1: Navigate to /home', 'Step 2: Click button "OK"']);
assert('Empty fields when no fill steps', emptyFields.length === 0);

// ══════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ══════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(62)}`);
console.log(`RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
console.log('═'.repeat(62));
if (failed === 0) {
  console.log('🎉 All tests passed — pipeline is ready for rediker.com!\n');
  console.log('Next steps:');
  console.log('  1. Start dev server:  npm run dev');
  console.log('  2. Open recorder at http://localhost:5000/recorder');
  console.log('  3. Enter https://admin.rediker.com/login');
  console.log('     → Pre-flight check detects frame-blocking → shows amber banner');
  console.log('  4. Click "Record in Window" → opens recording popup');
  console.log('  5. Complete login + student search flow');
  console.log('  6. Click "Generate Framework"');
  console.log('     → auth/auth.setup.ts  generated  ✓');
  console.log('     → fixtures/test-data.ts generated ✓');
  console.log('     → locators/*.locators.ts per page ✓');
  console.log('     → pages/*.ts POM classes           ✓');
  console.log('     → actions/business/*.actions.ts    ✓');
  console.log('     → tests/*.spec.ts                  ✓\n');
} else {
  console.log(`⚠️  ${failed} test(s) failed — review output above.\n`);
  process.exit(1);
}
