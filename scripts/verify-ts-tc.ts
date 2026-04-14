/**
 * verify-ts-tc.ts
 * Verifies TypeScript framework-aware generation (T1A/T1B/T1C)
 * and TestComplete + JavaScript generator (TASK 2).
 *
 * Run: npx tsx scripts/verify-ts-tc.ts
 */

import { generatePOMTestSuite } from '../server/pom-generator.js';
import type { FrameworkContext } from '../server/pom-generator.js';

// ── Minimal DOM data — uses domStructure shape (TypeScript generator) + inputs/buttons (TC/Java) ──
const domData = [
  {
    url: 'https://example.com/login',
    title: 'Login Page',
    // Top-level for TC + Java generators
    inputs: [
      { label: 'Username', name: 'username', type: 'text', selector: '#username' },
      { label: 'Password', name: 'password', type: 'password', selector: '#password' },
    ],
    buttons: [
      { text: 'Sign In', selector: '#signin-btn', type: 'submit' },
    ],
    forms: [{ action: '/login', method: 'post' }],
    links: [],
    // domStructure shape for TypeScript Playwright generator
    domStructure: {
      headings: { h1: ['Login'] },
      interactiveElements: {
        inputs: [
          { label: 'Username', name: 'username', type: 'text', selector: '#username', placeholder: 'Enter username' },
          { label: 'Password', name: 'password', type: 'password', selector: '#password', placeholder: 'Enter password' },
        ],
        buttons: [
          { text: 'Sign In', selector: '#signin-btn', type: 'submit' },
        ],
      },
      forms: [{ action: '/login', method: 'post' }],
      navigation: { navLinks: [] },
    },
  },
  {
    url: 'https://example.com/dashboard',
    title: 'Dashboard',
    inputs: [
      { label: 'Search', name: 'search', type: 'text', selector: '#search' },
    ],
    buttons: [
      { text: 'Logout', selector: '#logout' },
    ],
    forms: [],
    links: [],
    domStructure: {
      headings: { h1: ['Dashboard'] },
      interactiveElements: {
        inputs: [
          { label: 'Search', name: 'search', type: 'text', selector: '#search', placeholder: 'Search...' },
        ],
        buttons: [
          { text: 'Logout', selector: '#logout' },
        ],
      },
      forms: [],
      navigation: { navLinks: [] },
    },
  },
];

const testCases = [
  { name: 'Login with valid credentials', category: 'smoke', pageUrl: 'https://example.com/login' },
  { name: 'Search for item', category: 'functional', pageUrl: 'https://example.com/dashboard' },
];

const BASE_URL = 'https://example.com';

// ── Helper ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ════════════════════════════════════════════════════════════════════
// TEST GROUP 1: TypeScript framework-aware generation (T1A/T1B/T1C)
// ════════════════════════════════════════════════════════════════════
console.log('\n══ TEST GROUP 1: TypeScript Framework-Aware Generation ══\n');

// Scenario A: With a framework that has a known baseClass + importPath
const tsCtxWithImport: FrameworkContext = {
  name: 'MyPlaywrightFramework',
  framework: 'playwright',
  language: 'TypeScript',
  detectedLanguage: 'typescript',
  detectedTool: 'playwright',
  baseClass: 'BasePage',
  sampleScript: null,
  pattern: 'POM',
  functions: [
    {
      name: 'fillField',
      className: 'BasePage',
      importPath: '@myorg/fw/base',
      signature: 'fillField(locator: any, value: string): Promise<void>',
      description: 'fills an input field',
    } as any,
    {
      name: 'clickElement',
      className: 'BasePage',
      importPath: '@myorg/fw/base',
      signature: 'clickElement(locator: any): Promise<void>',
      description: 'clicks an element',
    } as any,
  ],
};

const suiteA = generatePOMTestSuite(domData, testCases, BASE_URL, tsCtxWithImport);

// T1A: real import statement
// The TS generator uses key=login → file is tests/pages/login.page.ts
const loginPageA = suiteA.files['tests/pages/login.page.ts'] ?? Object.values(suiteA.files).find((c: string) => c.includes('LoginPage'));
check(
  'T1A — real import statement generated (importPath known)',
  typeof loginPageA === 'string' && loginPageA.includes(`import { BasePage } from '@myorg/fw/base'`),
  `login page content snippet: ${typeof loginPageA === 'string' ? loginPageA.slice(0, 300) : 'NOT FOUND'}`
);

// T1B: fwFillFn used in fill method body
check(
  'T1B — fwFillFn used in fillUsername method',
  typeof loginPageA === 'string' && loginPageA.includes('fillField(this.usernameField'),
  `snippet: ${typeof loginPageA === 'string' ? loginPageA.match(/async fillUsername[\s\S]{0,200}/)?.[0] : 'NOT FOUND'}`
);

// T1C: fwClickFn used in click method body
check(
  'T1C — fwClickFn used in clickSignIn method',
  typeof loginPageA === 'string' && loginPageA.includes('clickElement(this.'),
  `snippet: ${typeof loginPageA === 'string' ? loginPageA.match(/async clickSignIn[\s\S]{0,200}/)?.[0] : 'NOT FOUND'}`
);

// Scenario B: baseClass set but NO importPath → TODO comment
const tsCtxNoImport: FrameworkContext = {
  name: 'UnknownFW',
  framework: 'playwright',
  language: 'TypeScript',
  detectedLanguage: 'typescript',
  detectedTool: 'playwright',
  baseClass: 'AbstractPage',
  sampleScript: null,
  pattern: 'POM',
  functions: [],
};

const suiteB = generatePOMTestSuite(domData, testCases, BASE_URL, tsCtxNoImport);
const loginPageB = suiteB.files['tests/pages/login.page.ts'] ?? Object.values(suiteB.files).find((c: string) => c.includes('LoginPage'));

check(
  'T1A — TODO comment when importPath unknown',
  typeof loginPageB === 'string' && loginPageB.includes(`// TODO: import { AbstractPage } from`),
  `snippet: ${typeof loginPageB === 'string' ? loginPageB.slice(0, 300) : 'NOT FOUND'}`
);

// Scenario C: No framework context → plain Playwright defaults
const suiteC = generatePOMTestSuite(domData, testCases, BASE_URL, undefined);
const loginPageC = suiteC.files['tests/pages/login.page.ts'] ?? Object.values(suiteC.files).find((c: string) => c.includes('LoginPage'));

check(
  'T1B fallback — plain .fill() used when no fwFillFn',
  typeof loginPageC === 'string' && loginPageC.includes('.fill('),
  `snippet: ${typeof loginPageC === 'string' ? loginPageC.match(/async fillUsername[\s\S]{0,200}/)?.[0] : 'NOT FOUND'}`
);

check(
  'T1C fallback — plain .click() used when no fwClickFn',
  typeof loginPageC === 'string' && loginPageC.includes('.click()'),
  `snippet: ${typeof loginPageC === 'string' ? loginPageC.match(/async clickSignIn[\s\S]{0,200}/)?.[0] : 'NOT FOUND'}`
);

// ════════════════════════════════════════════════════════════════════
// TEST GROUP 2: TestComplete + JavaScript Generator (TASK 2)
// ════════════════════════════════════════════════════════════════════
console.log('\n══ TEST GROUP 2: TestComplete + JavaScript Generator ══\n');

const tcCtx: FrameworkContext = {
  name: 'MyTCFramework',
  framework: 'testcomplete',
  language: 'JavaScript',
  detectedLanguage: 'javascript',
  detectedTool: 'testcomplete',
  baseClass: null,
  sampleScript: null,
  pattern: 'POM',
  functions: [
    {
      name: 'tcFill',
      className: 'TCHelper',
      importPath: null,
      signature: 'tcFill(element, value)',
      description: 'fills a TestComplete element',
    } as any,
    {
      name: 'tcClick',
      className: 'TCHelper',
      importPath: null,
      signature: 'tcClick(element)',
      description: 'clicks a TestComplete element',
    } as any,
  ],
};

const suiteTC = generatePOMTestSuite(domData, testCases, BASE_URL, tcCtx);

check(
  'TC — returns POMTestSuite object (not thrown)',
  suiteTC != null && typeof suiteTC.files === 'object',
);

check(
  'TC — Helper.js generated',
  'Script/Helper.js' in suiteTC.files,
  `files: ${Object.keys(suiteTC.files).join(', ')}`
);

check(
  'TC — LoginTests.js generated',
  Object.keys(suiteTC.files).some(f => f.includes('LoginTests.js')),
  `files: ${Object.keys(suiteTC.files).join(', ')}`
);

check(
  'TC — SuiteRunner.js generated',
  'Script/SuiteRunner.js' in suiteTC.files,
);

check(
  'TC — NameMapping guidance doc for Login generated',
  Object.keys(suiteTC.files).some(f => f.includes('namemapping-guidance') && f.includes('Login')),
  `files: ${Object.keys(suiteTC.files).join(', ')}`
);

const helperContent = suiteTC.files['Script/Helper.js'] ?? '';
check(
  'TC — Helper.js contains helperFill function',
  helperContent.includes('function helperFill'),
);
check(
  'TC — Helper.js contains helperClick function',
  helperContent.includes('function helperClick'),
);
check(
  'TC — Helper.js contains helperNavigate function',
  helperContent.includes('function helperNavigate'),
);

// fwFillFn / fwClickFn wired into interactions
const loginTCContent = Object.entries(suiteTC.files).find(([k]) => k.includes('LoginTests.js'))?.[1] ?? '';
check(
  'TC — fwFillFn (tcFill) used in LoginTests.js',
  loginTCContent.includes('tcFill('),
  `snippet: ${loginTCContent.slice(0, 500)}`
);
check(
  'TC — fwClickFn (tcClick) used in LoginTests.js',
  loginTCContent.includes('tcClick('),
  `snippet: ${loginTCContent.slice(0, 500)}`
);

// Fallback: TC with NO framework functions → uses .SetText / .Click
const tcCtxNoFw: FrameworkContext = {
  name: 'BareTC',
  framework: 'testcomplete',
  language: 'JavaScript',
  detectedLanguage: 'javascript',
  detectedTool: 'testcomplete',
  baseClass: null,
  sampleScript: null,
  pattern: 'POM',
  functions: [],
};

const suiteTCBare = generatePOMTestSuite(domData, testCases, BASE_URL, tcCtxNoFw);
const loginTCBare = Object.entries(suiteTCBare.files).find(([k]) => k.includes('LoginTests.js'))?.[1] ?? '';
check(
  'TC fallback — SetText() used when no fwFillFn',
  loginTCBare.includes('SetText('),
  `snippet: ${loginTCBare.slice(0, 400)}`
);
check(
  'TC fallback — Click() used when no fwClickFn',
  loginTCBare.includes('.Click()'),
  `snippet: ${loginTCBare.slice(0, 400)}`
);

// README generated
check(
  'TC — README.md generated',
  'README.md' in suiteTC.files,
);

// ════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(55)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(55));
if (failed > 0) {
  console.error('\n⚠️  Some checks failed. Review above for details.\n');
  process.exit(1);
} else {
  console.log('\n🎉 All checks passed!\n');
}
