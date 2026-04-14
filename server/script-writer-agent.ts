/**
 * Script Writer Agent
 * Takes recorded NL steps + start URL → generates a full POM framework via Claude.
 *
 * Output files:
 *   pages/<PageName>Page.ts          — Page Object (all locators)
 *   actions/generic/browser.actions.ts
 *   actions/generic/form.actions.ts
 *   actions/generic/assert.actions.ts
 *   actions/business/<domain>.actions.ts  — Business Actions (compose POM + generic)
 *   tests/<name>.spec.ts              — Clean test using only Business Actions
 *   playwright.config.ts
 *   package.json
 */

import Anthropic from "@anthropic-ai/sdk";

const clientOpts: { apiKey: string; baseURL?: string } = {
  apiKey: (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ''),
};
if (process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  clientOpts.baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
}
const anthropic = new Anthropic(clientOpts);

export interface LocatorEntry { name: string; strategy: string; description: string; }
export interface FunctionEntry { name: string; description: string; stepCount: number; }

export interface FileMetadata {
  // POM metadata
  className?: string;
  locators?: LocatorEntry[];
  methods?: string[];
  snapshotUsed?: boolean;   // true when ARIA snapshot informed locator generation
  // Business Actions metadata
  functions?: FunctionEntry[];
  // Test file metadata
  testCaseName?: string;
  businessScenario?: string;
  businessActionsUsed?: string[];
  assertionsUsed?: string[];
}

export interface GeneratedFile {
  path: string;       // e.g. "pages/ContactPage.ts"
  content: string;
  type: 'pom' | 'generic_action' | 'business_action' | 'test' | 'config';
  metadata?: FileMetadata;
}

export interface FrameworkGenerationResult {
  files: GeneratedFile[];
  pageName: string;
  businessDomain: string;
  testName: string;
}

// ─── Structured Output Tool Schemas ──────────────────────────────────────────

const TOOL_POM: Anthropic.Tool = {
  name: 'generate_page_object',
  description: 'Generate a Playwright Page Object split into two files: a locators file (object repository) and a page class file. Return both files plus structured metadata.',
  input_schema: {
    type: 'object' as const,
    properties: {
      locatorsCode: {
        type: 'string',
        description: 'Complete TypeScript locators file (object repository). MANDATORY RULES:\n1. ALWAYS use page.locator(\'xpath=...\') — NEVER use getByRole, getByLabel, getByPlaceholder, getByText\n2. XPath priority: @id (non-generated) > @data-testid > @aria-label > @name > text-based\n3. For nav links: ALWAYS scope to stable container: page.locator(\'xpath=//nav[@aria-label="..."]\')//a[...])\n4. Never use auto-generated IDs (mat-input-N, input_1234, GUIDs, hex hashes)\n5. Add comment on each locator: // Uniqueness: unique|verify | Stability: stable|fragile | Fallback: alternative-xpath\n6. Import must be: import { Page, Locator } from \'@playwright/test\';\nExample:\nimport { Page, Locator } from \'@playwright/test\';\nexport const AppPageLocators = {\n  // Uniqueness: unique | Stability: stable | Fallback: //input[@name="email"]\n  emailInput: (page: Page): Locator => page.locator(\'xpath=//input[@id="email"]\'),\n  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(@href,"submit")]\n  submitButton: (page: Page): Locator => page.locator(\'xpath=//button[@data-testid="submit"]\'),\n};'
      },
      code: {
        type: 'string',
        description: 'Complete TypeScript Page Object class file. Imports from the locators file. Contains ONLY methods (no inline locators). No markdown fences, no preamble.'
      },
      className: { type: 'string', description: 'The class name, e.g. ContactPage' },
      locators: {
        type: 'array',
        description: 'Every locator defined in the locators file',
        items: {
          type: 'object',
          properties: {
            name:        { type: 'string', description: 'Property name in the locators object, e.g. nameInput' },
            strategy:    { type: 'string', description: 'Playwright strategy used: getByRole, getByPlaceholder, getByLabel, getByText, locator' },
            description: { type: 'string', description: 'What UI element this targets' }
          },
          required: ['name', 'strategy', 'description']
        }
      },
      methods: {
        type: 'array',
        description: 'All async method names defined in the Page Object class',
        items: { type: 'string' }
      }
    },
    required: ['locatorsCode', 'code', 'className', 'locators', 'methods']
  }
};

const TOOL_BUSINESS_ACTIONS: Anthropic.Tool = {
  name: 'generate_business_actions',
  description: 'Generate a Business Actions TypeScript module. Return the code and metadata about each exported function.',
  input_schema: {
    type: 'object' as const,
    properties: {
      code: { type: 'string', description: 'Complete TypeScript module code — no markdown fences.' },
      functions: {
        type: 'array',
        description: 'Every exported async function in the module',
        items: {
          type: 'object',
          properties: {
            name:        { type: 'string', description: 'Function name, e.g. submitContactForm' },
            description: { type: 'string', description: 'One sentence describing the business intent' },
            stepCount:   { type: 'number', description: 'How many NL steps this function handles (approximate)' }
          },
          required: ['name', 'description', 'stepCount']
        }
      }
    },
    required: ['code', 'functions']
  }
};

const TOOL_TEST: Anthropic.Tool = {
  name: 'generate_test_file',
  description: 'Generate a Playwright test spec file using only Business Actions. Return the code and structured metadata.',
  input_schema: {
    type: 'object' as const,
    properties: {
      code: { type: 'string', description: 'Complete TypeScript test file — no markdown fences.' },
      testCaseName: { type: 'string', description: 'The string passed to test() or test.describe(), e.g. "Submit contact form and verify confirmation"' },
      businessScenario: { type: 'string', description: 'One sentence describing the business flow this test validates' },
      businessActionsUsed: {
        type: 'array',
        description: 'Names of business action functions called in the test body',
        items: { type: 'string' }
      },
      assertionsUsed: {
        type: 'array',
        description: 'Names of assertion helpers called (verifyText, verifyUrl, verifyVisible, etc.)',
        items: { type: 'string' }
      }
    },
    required: ['code', 'testCaseName', 'businessScenario', 'businessActionsUsed', 'assertionsUsed']
  }
};

// ─── Static Generic Action Files (no AI needed, stable across all frameworks) ─

const GENERIC_BROWSER_ACTIONS = `import { Page } from '@playwright/test';

/** Navigate to a URL and wait for the page to fully settle */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // After domcontentloaded, attempt networkidle with generous timeout for SPAs
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
    // networkidle timeout is acceptable on pages with long-running polling
  });
}

/** Click a link by its visible text. Uses .first() to avoid strict-mode errors. */
export async function clickLink(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name, exact: false }).first().click();
}

/** Click a button by its visible text. Uses .first() to avoid strict-mode errors. */
export async function clickButton(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: false }).first().click();
}

/** Click any element matching a CSS selector */
export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().click();
}

/** Hover over an element by CSS selector */
export async function hoverElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().hover();
}

/** Press a keyboard key (e.g. 'Enter', 'Tab', 'Escape') */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

/** Scroll an element into view */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

/** Wait for a URL pattern — pattern may be a path segment like '/dashboard' */
export async function waitForUrl(page: Page, pattern: string, timeoutMs = 15000): Promise<void> {
  const glob = pattern.startsWith('**') ? pattern : \`**\${pattern.startsWith('/') ? '' : '/'}\${pattern}\`;
  await page.waitForURL(glob, { timeout: timeoutMs });
}

/** Wait for an element to be visible */
export async function waitForVisible(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
}

/** Wait for an element to disappear (e.g. loading spinner) */
export async function waitForHidden(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  await page.locator(selector).first().waitFor({ state: 'hidden', timeout: timeoutMs });
}

/** Reload the current page */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Get the current page URL */
export async function getCurrentUrl(page: Page): Promise<string> {
  return page.url();
}

/**
 * Wait for network to settle after an action that triggers API calls.
 * Call AFTER the triggering action — never before.
 */
export async function waitForNetworkIdle(page: Page, timeoutMs = 15000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
}

/** Wait for a loading spinner / skeleton to disappear */
export async function waitForLoadingComplete(
  page: Page,
  spinnerSelector = '[class*="loading"], [class*="spinner"], [class*="skeleton"]'
): Promise<void> {
  try {
    const spinner = page.locator(spinnerSelector).first();
    if (await spinner.isVisible({ timeout: 2000 })) {
      await spinner.waitFor({ state: 'hidden', timeout: 15000 });
    }
  } catch {
    // spinner never appeared — that's fine
  }
}

/**
 * Click a button then wait for network to settle.
 * The click fires FIRST, then we await networkidle so we capture
 * the network activity triggered by that click (not a prior state).
 */
export async function clickAndWait(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: false }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

/**
 * Click a button that causes a full-page navigation.
 * Uses Promise.all so we start listening for navigation BEFORE the click fires.
 */
export async function clickAndNavigate(page: Page, name: string): Promise<void> {
  await Promise.all([
    page.waitForURL('**/*', { timeout: 20000 }),
    page.getByRole('button', { name, exact: false }).first().click(),
  ]);
}
`;

const GENERIC_FORM_ACTIONS = `import { Page } from '@playwright/test';

/**
 * Fill a field by label text, placeholder, or aria-label (in priority order).
 * Handles both label-associated inputs and placeholder-only inputs.
 */
export async function fillField(page: Page, labelOrPlaceholder: string, value: string) {
  // Try label-associated input first (most accessible pattern)
  const byLabel = page.getByLabel(labelOrPlaceholder, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().clear();
    await byLabel.first().fill(value);
    return;
  }
  // Fallback: placeholder attribute (case-insensitive)
  const byPlaceholder = page.getByPlaceholder(labelOrPlaceholder, { exact: false });
  if (await byPlaceholder.count() > 0) {
    await byPlaceholder.first().clear();
    await byPlaceholder.first().fill(value);
    return;
  }
  // Last resort: aria-label or name attribute
  await page.locator(
    \`input[aria-label*="\${labelOrPlaceholder}" i], textarea[aria-label*="\${labelOrPlaceholder}" i], input[name*="\${labelOrPlaceholder}" i]\`
  ).first().fill(value);
}

/** Fill a password field — reads value from TEST_PASSWORD env var for security */
export async function fillPassword(page: Page, labelOrPlaceholder: string) {
  const val = process.env.TEST_PASSWORD || '';
  const byLabel = page.getByLabel(labelOrPlaceholder, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().fill(val);
    return;
  }
  await page.locator(\`input[type="password"]\`).first().fill(val);
}

/** Clear a field then type value character by character (useful for autocomplete inputs) */
export async function typeInField(page: Page, labelOrPlaceholder: string, value: string) {
  const byLabel = page.getByLabel(labelOrPlaceholder, { exact: false });
  const locator = await byLabel.count() > 0
    ? byLabel.first()
    : page.getByPlaceholder(labelOrPlaceholder, { exact: false }).first();
  await locator.clear();
  await locator.pressSequentially(value, { delay: 50 });
}

/** Check a checkbox by label text or selector */
export async function checkBox(page: Page, labelOrSelector: string) {
  const byLabel = page.getByLabel(labelOrSelector, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().check();
    return;
  }
  await page.locator(labelOrSelector).first().check();
}

/** Uncheck a checkbox by label text or selector */
export async function uncheckBox(page: Page, labelOrSelector: string) {
  const byLabel = page.getByLabel(labelOrSelector, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().uncheck();
    return;
  }
  await page.locator(labelOrSelector).first().uncheck();
}

/** Select a dropdown option by the field's label and the option's visible text */
export async function selectOption(page: Page, labelText: string, value: string) {
  const byLabel = page.getByLabel(labelText, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.selectOption({ label: value });
    return;
  }
  // Fallback: find select element by name attribute
  await page.locator(\`select[name*="\${labelText}" i]\`).first().selectOption({ label: value });
}

/** Upload a file to a file input */
export async function uploadFile(page: Page, labelText: string, filePath: string) {
  const byLabel = page.getByLabel(labelText, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().setInputFiles(filePath);
    return;
  }
  await page.locator('input[type="file"]').first().setInputFiles(filePath);
}

/** Submit the active form — tries submit button first, then form.submit() */
export async function submitForm(page: Page, buttonText?: string) {
  if (buttonText) {
    await page.getByRole('button', { name: buttonText, exact: false }).first().click();
    return;
  }
  // Try common submit button patterns
  const submitBtn = page.getByRole('button', { name: /submit|save|continue|next|login|sign in/i });
  if (await submitBtn.count() > 0) {
    await submitBtn.first().click();
    return;
  }
  await page.locator('[type="submit"]').first().click();
}
`;

const GENERIC_ASSERT_ACTIONS = `import { Page, expect } from '@playwright/test';

/** Assert visible text exists on the page (substring match by default) */
export async function verifyText(page: Page, text: string, exact = false) {
  await expect(page.getByText(text, { exact }).first()).toBeVisible();
}

/** Assert current URL contains a path */
export async function verifyUrl(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^$\{}()|[\\]\\\\]/g, '\\\\$&')));
}

/** Assert an element (by CSS/role selector) is visible */
export async function verifyVisible(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeVisible();
}

/** Assert page does NOT contain text */
export async function verifyNotPresent(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).not.toBeVisible();
}

/** Assert an input or textarea has a specific value */
export async function verifyInputValue(page: Page, label: string, expected: string) {
  const loc = page.locator(\`input[placeholder*="\${label}" i], textarea[placeholder*="\${label}" i], input[aria-label*="\${label}" i]\`).first();
  await expect(loc).toHaveValue(expected);
}

/** Assert an input value contains a substring */
export async function verifyInputContains(page: Page, label: string, substring: string) {
  const loc = page.locator(\`input[placeholder*="\${label}" i], textarea[placeholder*="\${label}" i]\`).first();
  await expect(loc).toHaveValue(new RegExp(substring, 'i'));
}

/** Assert a button or element is enabled */
export async function verifyEnabled(page: Page, label: string) {
  await expect(page.getByRole('button', { name: label, exact: false })).toBeEnabled();
}

/** Assert a button or element is disabled */
export async function verifyDisabled(page: Page, label: string) {
  await expect(page.getByRole('button', { name: label, exact: false })).toBeDisabled();
}

/** Assert a checkbox or radio is checked */
export async function verifyChecked(page: Page, label: string) {
  await expect(page.getByLabel(label, { exact: false })).toBeChecked();
}

/** Assert a checkbox or radio is NOT checked */
export async function verifyUnchecked(page: Page, label: string) {
  await expect(page.getByLabel(label, { exact: false })).not.toBeChecked();
}

/** Assert an element has a specific HTML attribute value */
export async function verifyAttribute(page: Page, label: string, attr: string, expected: string) {
  const loc = page.getByText(label, { exact: false }).first();
  await expect(loc).toHaveAttribute(attr, expected);
}

/** Assert the number of elements matching a selector */
export async function verifyCount(page: Page, selector: string, count: number) {
  await expect(page.locator(selector)).toHaveCount(count);
}

/**
 * Soft assertion wrapper — logs failure without stopping the test.
 * Usage: await softAssert(() => verifyText(page, 'Success'), failures)
 */
export async function softAssert(
  fn: () => Promise<void>,
  failures: string[]
): Promise<void> {
  try {
    await fn();
  } catch (e: any) {
    failures.push(e.message || String(e));
    console.warn('[SOFT ASSERT FAILED]', e.message);
  }
}
`;

function buildPlaywrightConfig(hasAuth: boolean, startUrl: string): string {
  // Shared config block used in both auth and non-auth variants
  const sharedConfig = `  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    headless: process.env.CI ? true : false,
    baseURL: process.env.BASE_URL || '${startUrl}',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Path aliases from tsconfig.json are honoured automatically by Playwright
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],
  outputDir: 'test-results',`;

  if (hasAuth) {
    return `import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
${sharedConfig}
  projects: [
    // 1. Run auth setup first — logs in and saves session to .auth/user.json
    {
      name: 'setup',
      testMatch: /auth\\.setup\\.ts/,
    },
    // 2. Run all tests with the saved session (no login per test)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
`;
  }

  return `import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
${sharedConfig}
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;
}

const PACKAGE_JSON = `{
  "name": "recorded-test-framework",
  "version": "1.0.0",
  "description": "Auto-generated POM test framework from NAT 2.0 Recording Studio",
  "scripts": {
    "postinstall": "npx playwright install --with-deps chromium",
    "test": "npx playwright test",
    "test:headed": "npx playwright test --headed",
    "test:ui": "npx playwright test --ui",
    "test:auth": "npx playwright test --project=setup",
    "test:ci": "npx playwright test --reporter=junit,html",
    "test:debug": "npx playwright test --debug",
    "report": "npx playwright show-report"
  },
  "dependencies": {
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "typescript": "^5.4.0"
  }
}
`;

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@pages/*":    ["pages/*"],
      "@locators/*": ["locators/*"],
      "@actions/*":  ["actions/*"],
      "@fixtures/*": ["fixtures/*"],
      "@auth/*":     ["auth/*"]
    },
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "playwright-report", "test-results"]
}
`;

const README_MD = `# Auto-Generated Test Framework
Generated by **NAT 2.0 Recording Studio**.

## Folder Structure
\`\`\`
locators/            ← Object Repository — single source of truth for all selectors
pages/               ← Page Object Models — methods only, imports from locators/
actions/
  generic/           ← App-agnostic helpers: browser, form, assert, waits
  business/          ← Domain actions composed from POM + generic helpers
fixtures/
  test-data.ts       ← Parameterised test values (reads from .env)
auth/
  auth.setup.ts      ← One-time login → saves session to .auth/user.json
tests/               ← Test specs — only Business Actions called here
playwright.config.ts ← Configured for CI (JUnit + HTML reporters, storageState)
.env.example         ← Copy to .env and fill credentials
.gitignore           ← Excludes .auth/, .env, node_modules/
\`\`\`

## First-time setup
\`\`\`bash
# 1. Install dependencies (Playwright browsers install automatically via postinstall)
npm install

# 2. Configure credentials
cp .env.example .env
# Edit .env and set TEST_USERNAME, TEST_PASSWORD, BASE_URL

# 3. Run tests
npm test            # headless (default)
npm run test:headed # headed — see the browser
npm run test:ui     # Playwright UI mode — step through interactively
\`\`\`

## CI / Azure DevOps / GitHub Actions
\`\`\`bash
npm run test:ci     # generates playwright-report/ and test-results/results.xml
\`\`\`

## Fixing a broken locator
Edit the relevant \`locators/*.locators.ts\` file — one change heals every test that uses it.

## Path aliases
All imports use \`@pages/\`, \`@actions/\`, \`@locators/\`, \`@fixtures/\` — resolves via tsconfig baseUrl.
No relative path fragility (\`../../..\`) anywhere in the codebase.
`;

// ─── Claude Prompts ────────────────────────────────────────────────────────────

function buildPageObjectPrompt(nlSteps: string[], startUrl: string, pageName: string, ariaSnapshot?: string): string {
  const snapshotSection = ariaSnapshot
    ? `
## Live Accessibility Tree (source of truth for locator identification)
The following ARIA snapshot was captured from the live page at ${startUrl}.
Use the accessible names and roles shown here to identify elements — but ALL locators MUST still use page.locator('xpath=...') format (never getByRole/getByLabel/getByText).

\`\`\`
${ariaSnapshot}
\`\`\`

Use the ARIA tree to determine the correct @aria-label, @name, text content, and container relationships.
Then express each locator as an XPath following the MANDATORY LOCATOR RULES below.
`
    : `
No live page snapshot available — infer locators from the recorded steps and standard conventions.
`;

  return `You are a senior QA automation engineer. Generate a Playwright Page Object class for "${pageName}".

The test flow recorded on ${startUrl} has these steps:
${nlSteps.map((s, i) => `${i + 1}. ${s.replace(/^Step \d+:\s*/, '')}`).join('\n')}
${snapshotSection}
Generate TWO TypeScript files following these strict rules:

### FILE 1 — Object Repository (locatorsCode)
File: locators/${pageName}Page.locators.ts
- Import: import { Page, Locator } from '@playwright/test';
- Export a single const object named \`${pageName}PageLocators\`
- Each property is a FACTORY FUNCTION: \`(page: Page): Locator => ...\`
- Add a JSDoc comment on each property explaining the UI element
- This is the SINGLE SOURCE OF TRUTH — no raw selectors anywhere else

MANDATORY LOCATOR RULES — NON-NEGOTIABLE:
1. ALL locators MUST use page.locator('xpath=...') format — NEVER use getByRole, getByLabel, getByPlaceholder, getByText
2. Import must be: import { Page, Locator } from '@playwright/test';
3. PRIORITY ORDER:
   P1 STABLE: @id (non-auto-generated), @data-testid, @data-automation-id, @aria-label, @name on form controls
   P2 ACCEPTABLE: @placeholder, normalize-space(text()) for buttons/links, label[for] relationship
   P3 RELATIVE: anchor to stable parent container, then navigate to element
   P4 COMBINATION: [@type='text' and @placeholder='...'] multi-attribute

4. AUTO-GENERATED IDs TO REJECT (use next strategy instead):
   - mat-input-N, ng-input-N, react-N, ember-N (framework-generated)
   - input_1234, field_5678 (sequential numbers)
   - GUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   - CSS hashes: css-abc123, sc-def456, styled-ghi789
   - Any id containing 5+ hex chars: a1b2c3d4

5. NAV LINK SCOPING (critical for multi-element pages):
   - ALWAYS scope nav links to their container to avoid footer duplicates
   - Find the closest stable ancestor: nav[@aria-label], header, [id*="nav"], [id*="header"]
   - Example: page.locator('xpath=//nav[@aria-label=\\'Main Navigation\\']//a[text()=\\'About\\']')
   - NEVER: page.locator('xpath=//a[text()=\\'About\\']') — matches header AND footer

6. DYNAMIC CONTENT RULE:
   - NEVER use H1/H2 text as locator if it contains: years (2024, 2025), campaign text, promotional copy
   - Instead use structural: page.locator('xpath=//main//h1[1]')
   - Flag with comment: // Stability: fragile — content changes with campaigns

7. REQUIRED COMMENT FORMAT on every locator:
   // Uniqueness: unique|verify | Stability: stable|fragile | Fallback: //alternative[@xpath]

8. IMPORT STATEMENT IN EVERY LOCATORS FILE:
   import { Page, Locator } from '@playwright/test';
   (NOT: import { Page } from '@playwright/test';)

XPath strategy details:
- P1: page.locator('xpath=//*[@id=\\'submit-btn\\']')           — id (non-generated)
- P1: page.locator('xpath=//*[@data-testid=\\'btn\\']')         — data-testid/data-automation-id
- P1: page.locator('xpath=//button[@aria-label=\\'Close\\']')   — aria-label
- P1: page.locator('xpath=//input[@name=\\'username\\']')       — name attribute (form fields)
- P2: page.locator('xpath=//button[normalize-space(text())=\\'Submit\\']')
- P2: page.locator('xpath=//a[normalize-space(text())=\\'Home\\']')
- P2: page.locator('xpath=//label[normalize-space(text())=\\'Policy Number\\']/following-sibling::input[1]')
- P2: page.locator('xpath=//input[@placeholder=\\'Enter Policy Number\\']')
- P3: page.locator('xpath=//form[@id=\\'policy-form\\']//input[@name=\\'deductible\\']')
- P3: page.locator('xpath=//*[@data-testid=\\'login-panel\\']//input[@type=\\'password\\']')
   NEVER: /html/body/div[3]/form/div[2]/input (absolute paths)
- P4: page.locator('xpath=//input[@type=\\'text\\' and @placeholder=\\'Enter Policy Number\\']')

NEVER USE:
   - Index-only XPath: //div[4]/span[2]
   - Auto-generated class XPaths: //div[@class=\\'css-xk39d8\\']
   - Absolute paths from html root
   - Generated IDs (GUIDs, mat-input-3, input_1748392, css-xk39d8)

Example:
\`\`\`typescript
import { Page, Locator } from '@playwright/test';
export const ${pageName}PageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='email']
  emailInput: (page: Page): Locator => page.locator("xpath=//input[@id='email']"),
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Submit']
  submitButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='submit-btn']"),
  // Uniqueness: likely unique | Stability: stable | Fallback: //input[@type='text' and @placeholder='Search...']
  searchInput: (page: Page): Locator => page.locator("xpath=//input[@placeholder='Search...']"),
};
\`\`\`

### FILE 2 — Page Object Class (code)
File: pages/${pageName}Page.ts
- Import: import { Page } from '@playwright/test';
- Import: import { ${pageName}PageLocators } from '@locators/${pageName}Page.locators';
- Class name: ${pageName}Page — constructor receives \`page: Page\`
- Methods call locators via \`${pageName}PageLocators.prop(this.page)\`
- ZERO inline selectors — 100% delegated to the locators file
- Before EVERY interaction: await locator.waitFor({ state: 'visible' })
- Navigation-triggering clicks: await Promise.all([page.waitForLoadState('networkidle').catch(()=>{}), locator.click()])
- NEVER use waitForTimeout — only condition-based waits

Call the generate_page_object tool. Put raw TypeScript (no markdown fences) in 'locatorsCode' and 'code'.
List every locator in 'locators'. List every method in 'methods'.`;
}

function buildBusinessActionsPrompt(nlSteps: string[], pageName: string, domain: string, ariaSnapshot?: string): string {
  const snapshotHint = ariaSnapshot
    ? `\nPage structure reference (trimmed):\n\`\`\`\n${ariaSnapshot.slice(0, 2000)}\n\`\`\`\nUse visible text labels from the tree when constructing verifyText / verifyVisible assertions.\n`
    : '';

  return `You are a senior QA automation engineer. Generate a Business Actions file for the "${domain}" domain.

These steps were recorded (steps prefixed "Assert" are assertions, not interactions):
${nlSteps.map((s, i) => `${i + 1}. ${s.replace(/^Step \d+:\s*/, '')}`).join('\n')}
${snapshotHint}
Generate TypeScript business action functions following these STRICT rules:

IMPORTS — always use @-alias paths (resolved via tsconfig baseUrl):
1. import { ${pageName}Page } from '@pages/${pageName}Page'
2. import { navigateTo, clickButton, clickLink, waitForNetworkIdle, clickAndWait } from '@actions/generic/browser.actions'
3. import { fillField, submitForm, typeInField, selectOption } from '@actions/generic/form.actions'
4. import { verifyText, verifyUrl, verifyVisible, verifyNotPresent, verifyInputValue, verifyAttribute, softAssert } from '@actions/generic/assert.actions'
5. import { testData } from '@fixtures/test-data'

FUNCTION DESIGN:
6. Create 1-3 functions that each represent a complete BUSINESS SCENARIO (e.g. submitContactForm, searchProduct, completeCheckout)
7. Each function signature: async function myAction(page: Page, data = testData)
8. Use data.fieldName to reference values — NEVER hardcode strings from the recording
9. For "[soft]" assertion steps, use: const failures: string[] = []; await softAssert(() => verifyX(...), failures);
10. After a click that triggers API/navigation, always follow with: await waitForNetworkIdle(page)
11. Assertions must be SPECIFIC: verify the exact value entered, the resulting URL, or a unique success indicator — NOT generic text like 'Welcome'
12. Each assertion comment explains WHAT BUSINESS RULE it validates

SHADOW DOM:
13. For elements inside web components or iframes, use page.frameLocator() or locator.locator() chaining

Call the generate_business_actions tool. Put the raw TypeScript code (no markdown fences) in 'code'.
List every exported function in 'functions' with its business-intent description and approximate step count.`;
}

function buildTestFilePrompt(nlSteps: string[], testName: string, startUrl: string, pageName: string, domain: string): string {
  return `You are a senior QA automation engineer. Generate a clean Playwright test file.

The recorded flow: "${testName}" on ${startUrl}
Steps: ${nlSteps.map((s, i) => `${i + 1}. ${s.replace(/^Step \d+:\s*/, '')}`).join(' | ')}

Generate a TypeScript test file following these STRICT rules:

IMPORTS — always use @-alias paths:
1. import { test } from '@playwright/test'
2. import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions'
3. import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait } from '../helpers/universal'
4. import { /* business functions */ } from '@actions/business/${domain}.actions'
5. import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions'
6. import { testData } from '@fixtures/test-data'

TEST STRUCTURE:
7. ONE test.describe block named after the business feature being tested
8. ONE test case per logical user journey — name it as a clear business statement
9. Test function signature MUST be: async ({ page, context }) => { ... }
10. Add test.use({ storageState: '.auth/user.json' }) if the flow requires authentication
11. Always start with: await navigateTo(page, testData.baseUrl)
12. Immediately after navigateTo, call: await prepareSite(page);  (replaces waitForLoadState)
13. Call business action functions from '${domain}.actions' — NEVER inline raw Playwright calls
14. End with specific assertions that prove the business outcome succeeded:
    - Verify the resulting URL (proves navigation completed)
    - Verify a unique success element or message (proves the action worked)
    - Verify data that was submitted appears in the result (proves persistence)
15. Use testData.fieldName for all values — NO hardcoded strings from the recording

CRITICAL RULES:
- NEVER call page.waitForLoadState() directly in test body — use prepareSite(page) instead
- ALWAYS use async ({ page, context }) as the test function parameter destructuring
- Import prepareSite from '../helpers/universal' — it handles all page-ready logic

Call the generate_test_file tool. Put the raw TypeScript code (no markdown fences) in 'code'.
Populate 'testCaseName', 'businessScenario', 'businessActionsUsed', and 'assertionsUsed'.`;
}

// ─── Main Generator ────────────────────────────────────────────────────────────

function deriveNames(startUrl: string, nlSteps: string[], testName: string): { pageName: string; domain: string; testFileName: string } {
  // Derive page name from URL
  let pageName = 'App';
  try {
    const url = new URL(startUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      // If the last segment is a numeric ID (e.g. /students/12345), use parent + "Detail"
      const last = parts[parts.length - 1];
      const isNumericOrId = /^\d+$/.test(last) || /^[a-f0-9-]{8,}$/i.test(last);
      let segment: string;
      if (isNumericOrId && parts.length >= 2) {
        const parent = parts[parts.length - 2].replace(/[-_]/g, ' ');
        segment = parent.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Detail';
      } else {
        segment = last.replace(/[-_]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }
      pageName = segment || 'App';
    } else {
      pageName = url.hostname.split('.')[0].charAt(0).toUpperCase() + url.hostname.split('.')[0].slice(1);
    }
  } catch {}

  // Derive domain from steps (look for verbs)
  const allText = nlSteps.join(' ').toLowerCase();
  let domain = 'app';
  if (allText.includes('login') || allText.includes('sign in') || allText.includes('password')) domain = 'auth';
  else if (allText.includes('contact') || allText.includes('form')) domain = 'contact';
  else if (allText.includes('checkout') || allText.includes('cart') || allText.includes('purchase')) domain = 'checkout';
  else if (allText.includes('search')) domain = 'search';
  else if (allText.includes('register') || allText.includes('signup')) domain = 'registration';
  else domain = pageName.toLowerCase();

  const testFileName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');

  return { pageName, domain, testFileName };
}

// ─── GAP 1: Auth Detection & Setup ───────────────────────────────────────────

export interface AuthInfo {
  hasAuth: boolean;
  loginUrl?: string;
  usernameStep?: string;
  passwordStep?: string;
  submitStep?: string;
  usernameLabel?: string;
  passwordLabel?: string;
  submitLabel?: string;
}

// ─── Test Data Extractor ──────────────────────────────────────────────────────

interface ExtractedField { key: string; value: string; label: string; isSensitive: boolean }

function extractTestData(nlSteps: string[], startUrl: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  // Match: Enter "VALUE" in the "LABEL" field
  const fillPattern = /Enter\s+"(.+?)"\s+in the\s+"(.+?)"\s+field/i;
  // Match: Enter "***MASKED***" in the "LABEL" field
  const maskedPattern = /Enter\s+"\*\*\*MASKED\*\*\*"\s+in the\s+"(.+?)"\s+field/i;

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
        const isSensitive = /password|secret|token|key/i.test(label);
        fields.push({ key, value, label, isSensitive });
        seen.add(key);
      }
    }
  }
  return fields;
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function buildTestDataFile(fields: ExtractedField[], startUrl: string): string {
  const lines: string[] = [
    `import * as dotenv from 'dotenv';`,
    `dotenv.config();`,
    ``,
    `/**`,
    ` * Test data — extracted from recorded interactions.`,
    ` * Sensitive values (passwords, tokens) are read from environment variables.`,
    ` * Override any value by setting the corresponding env var.`,
    ` */`,
    `export const testData = {`,
    `  /** Base URL of the application under test */`,
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
  lines.push(``);
  lines.push(`export type TestData = typeof testData;`);
  return lines.join('\n');
}

function toScreamingSnake(camel: string): string {
  return camel
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '');
}

export function detectAuthSteps(nlSteps: string[]): AuthInfo {
  const maskedIdx = nlSteps.findIndex(s => /Enter.*"\*\*\*MASKED\*\*\*"/.test(s));
  if (maskedIdx === -1) return { hasAuth: false };

  const passwordStep = nlSteps[maskedIdx];
  const passwordLabelMatch = passwordStep.match(/Enter.*in the "(.+)" field/);
  const passwordLabel = passwordLabelMatch?.[1] || 'Password';

  // Username is the step just before masked step that fills a field
  let usernameStep: string | undefined;
  let usernameLabel = 'Email';
  for (let i = maskedIdx - 1; i >= 0; i--) {
    const m = nlSteps[i].match(/Enter ".+" in the "(.+)" field/);
    if (m) {
      usernameStep = nlSteps[i];
      usernameLabel = m[1];
      break;
    }
  }

  // Submit is the step right after masked step that clicks a button
  let submitStep: string | undefined;
  let submitLabel = 'Sign In';
  for (let i = maskedIdx + 1; i < Math.min(maskedIdx + 4, nlSteps.length); i++) {
    const m = nlSteps[i].match(/Click button "(.+)"/);
    if (m) {
      submitStep = nlSteps[i];
      submitLabel = m[1];
      break;
    }
  }

  return {
    hasAuth: true,
    usernameStep,
    passwordStep,
    submitStep,
    usernameLabel,
    passwordLabel,
    submitLabel,
  };
}

function buildAuthSetupContent(authInfo: AuthInfo, startUrl: string): string {
  const usernameLabel = authInfo.usernameLabel || 'Email';
  const passwordLabel = authInfo.passwordLabel || 'Password';
  const submitLabel = authInfo.submitLabel || 'Sign In';
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

  // Fill username — reads from TEST_USERNAME env var
  await page.getByLabel('${usernameLabel}', { exact: false }).fill(process.env.TEST_USERNAME || '');

  // Fill password — reads from TEST_PASSWORD env var
  await page.getByLabel('${passwordLabel}', { exact: false }).fill(process.env.TEST_PASSWORD || '');

  // Submit login form
  await page.getByRole('button', { name: '${submitLabel}', exact: false }).click();

  // Wait for successful login (URL should change away from login page)
  await page.waitForURL(url => !url.href.includes('${loginPathSegment}'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Save session cookies/storage for all subsequent tests
  await page.context().storageState({ path: authFile });
  console.log('✅ Auth state saved to .auth/user.json');
});
`;
}

const ENV_EXAMPLE = `# Test credentials — copy to .env and fill in real values
TEST_USERNAME=your-username@example.com
TEST_PASSWORD=your-password
`;

const GITIGNORE = `node_modules/
dist/
.auth/
.env
playwright-report/
test-results/
`;

// ─── GAP 3: Multi-page Analysis ──────────────────────────────────────────────

interface PageGroup {
  url: string;
  pageName: string;
  domain: string;
  steps: string[];
  isAuthPage: boolean;
}

function analyzePages(
  nlSteps: string[],
  events: Array<{ sequence: number; type: string; url: string; naturalLanguage: string }>,
  startUrl: string
): PageGroup[] {
  // Build a map: NL step text → URL from events
  const stepUrlMap = new Map<string, string>();
  for (const evt of events) {
    if (evt.naturalLanguage && evt.url) {
      const rawUrl = evt.url;
      let realUrl = rawUrl;
      try {
        const m = rawUrl.match(/\/api\/recorder\/browse\?url=(.+)/);
        if (m) realUrl = decodeURIComponent(m[1]);
      } catch {}
      stepUrlMap.set(evt.naturalLanguage.trim(), realUrl);
    }
  }

  const groups: PageGroup[] = [];
  let currentUrl = startUrl;
  let currentSteps: string[] = [];

  const flush = (url: string) => {
    if (currentSteps.length === 0) return;
    const { pageName, domain } = deriveNames(url, currentSteps, '');
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

  // Deduplicate by URL path prefix — merge steps from same page
  const merged = new Map<string, PageGroup>();
  for (const g of groups) {
    let key = g.url;
    try {
      key = new URL(g.url).pathname.split('/').slice(0, 3).join('/');
    } catch {}
    if (merged.has(key)) {
      merged.get(key)!.steps.push(...g.steps);
    } else {
      merged.set(key, { ...g });
    }
  }

  return Array.from(merged.values());
}

export type GeneratorEvent =
  | { type: 'file';     file: GeneratedFile }
  | { type: 'status';   message: string }
  | { type: 'error';    message: string }
  | { type: 'thinking'; label: string; content: string };

/** Extract the thinking block from a response (may be absent when thinking disabled) */
function extractThinking(content: Anthropic.ContentBlock[]): string {
  const thinkingBlock = content.find(b => b.type === 'thinking') as Anthropic.ThinkingBlock | undefined;
  return thinkingBlock?.thinking || '';
}

/** Extract structured tool input from a forced tool_choice response */
function extractToolInput<T>(content: Anthropic.ContentBlock[], toolName: string): T | null {
  const toolUseBlock = content.find(
    b => b.type === 'tool_use' && (b as Anthropic.ToolUseBlock).name === toolName
  ) as Anthropic.ToolUseBlock | undefined;
  return toolUseBlock ? (toolUseBlock.input as T) : null;
}

// ─── Live Page Snapshot (Playwright MCP-style locators) ──────────────────────

/**
 * Navigate to the target URL with a headless browser, capture the ARIA
 * accessibility tree, and return it as a compact YAML-like string.
 * This gives Claude real DOM context so it generates accurate locators
 * (e.g. getByRole('textbox', { name: 'Email address' })) instead of guessing
 * from NL step text alone — the same technique used by the Playwright MCP server.
 */
async function captureAriaSnapshot(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return '';
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Wait a tick for React/Vue/Angular to hydrate
      await page.waitForTimeout(800);
    } catch {
      // partial load is fine — snapshot what loaded
    }

    let snapshot = '';
    try {
      // ariaSnapshot() available since Playwright 1.46 — returns YAML-like ARIA tree
      snapshot = await page.locator('body').ariaSnapshot();
    } catch {
      // Fallback: older accessibility API
      const tree = await page.accessibility.snapshot();
      if (tree) snapshot = JSON.stringify(tree, null, 2);
    }

    await browser.close();
    // Trim to avoid huge prompts — 6000 chars is plenty for a full page tree
    return snapshot.slice(0, 6000);
  } catch {
    return ''; // page unreachable or auth-gated — degrade gracefully
  }
}

export async function* generateFramework(
  nlSteps: string[],
  startUrl: string,
  testName: string,
  events: Array<{ sequence: number; type: string; url: string; naturalLanguage: string }> = []
): AsyncGenerator<GeneratorEvent> {
  const { pageName, domain, testFileName } = deriveNames(startUrl, nlSteps, testName);

  // ── Structured output types (match the tool schemas above) ──────────────────
  interface PomToolInput {
    locatorsCode: string;
    code: string;
    className: string;
    locators: Array<{name: string; strategy: string; description: string}>;
    methods: string[];
  }
  interface BusinessActionsToolInput {
    code: string;
    functions: Array<{name: string; description: string; stepCount: number}>;
  }
  interface TestToolInput {
    code: string; testCaseName: string; businessScenario: string;
    businessActionsUsed: string[]; assertionsUsed: string[];
  }

  // ── GAP 1: Auth detection ───────────────────────────────────────────────────
  const authInfo = detectAuthSteps(nlSteps);

  // 1. Emit static generic files immediately (no AI)
  yield { type: 'status', message: 'Generating generic action library...' };

  // Extract test data from recorded steps → fixtures/test-data.ts
  const extractedFields = extractTestData(nlSteps, startUrl);
  const testDataContent  = buildTestDataFile(extractedFields, startUrl);

  const genericFiles: GeneratedFile[] = [
    { path: 'actions/generic/browser.actions.ts', content: GENERIC_BROWSER_ACTIONS, type: 'generic_action' },
    { path: 'actions/generic/form.actions.ts',    content: GENERIC_FORM_ACTIONS,    type: 'generic_action' },
    { path: 'actions/generic/assert.actions.ts',  content: GENERIC_ASSERT_ACTIONS,  type: 'generic_action' },
    { path: 'fixtures/test-data.ts',              content: testDataContent,          type: 'config' },
    { path: 'package.json',                       content: PACKAGE_JSON,            type: 'config' },
    { path: 'tsconfig.json',                      content: TSCONFIG_JSON,           type: 'config' },
    { path: 'README.md',                          content: README_MD,               type: 'config' },
    // Always emit .gitignore and .env.example
    { path: '.gitignore',                         content: GITIGNORE,               type: 'config' },
    { path: '.env.example',                       content: ENV_EXAMPLE,             type: 'config' },
  ];

  for (const f of genericFiles) {
    yield { type: 'file', file: f };
  }

  // Emit playwright.config.ts with auth awareness
  yield {
    type: 'file',
    file: {
      path: 'playwright.config.ts',
      content: buildPlaywrightConfig(authInfo.hasAuth, startUrl),
      type: 'config',
    }
  };

  // If auth detected, emit auth setup files
  if (authInfo.hasAuth) {
    yield { type: 'status', message: '🔐 Auth detected — generating auth/auth.setup.ts + .env.example...' };
    yield {
      type: 'file',
      file: {
        path: 'auth/auth.setup.ts',
        content: buildAuthSetupContent(authInfo, startUrl),
        type: 'config',
      }
    };
  }

  // ── GAP 3: Multi-page analysis ──────────────────────────────────────────────
  const pages = analyzePages(nlSteps, events, startUrl);
  const isMultiPage = pages.length > 1;

  if (isMultiPage) {
    yield { type: 'status', message: `📄 Detected ${pages.length} pages in recording — generating per-page POMs...` };
  } else {
    yield { type: 'status', message: `📄 Single-page recording detected` };
  }

  // Helper to generate POM for a single page group
  async function* generatePagePom(pageGroup: PageGroup): AsyncGenerator<GeneratorEvent> {
    const pg = pageGroup.pageName;

    // Capture ARIA snapshot for this page
    yield { type: 'status', message: `🎭 Capturing accessibility tree from ${pageGroup.url}...` };
    const ariaSnapshot = await captureAriaSnapshot(pageGroup.url);
    if (ariaSnapshot) {
      const lineCount = ariaSnapshot.split('\n').length;
      yield { type: 'status', message: `✅ Snapshot captured for ${pg} (${lineCount} nodes)` };
    } else {
      yield { type: 'status', message: `⚠️  ${pg} not reachable — inferring locators from steps` };
    }

    yield { type: 'status', message: `🧠 Generating locators/${pg}Page.locators.ts + pages/${pg}Page.ts...` };
    try {
      const pomResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 12000,
        thinking:    { type: 'enabled', budget_tokens: 7000 },
        tools:       [TOOL_POM],
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: buildPageObjectPrompt(pageGroup.steps, pageGroup.url, pg, ariaSnapshot) }]
      });
      const pomThinking = extractThinking(pomResponse.content);
      let pomInput = extractToolInput<PomToolInput>(pomResponse.content, 'generate_page_object');
      if (!pomInput) {
        const textBlock = pomResponse.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined;
        const rawCode = textBlock?.text || '// Page Object generation produced no output';
        pomInput = { locatorsCode: '', code: rawCode, className: `${pg}Page`, locators: [], methods: [] };
      }
      if (pomThinking) {
        yield { type: 'thinking', label: `${pg}Page — locator reasoning`, content: pomThinking };
      }
      if (pomInput.locatorsCode?.trim()) {
        yield {
          type: 'file',
          file: {
            path: `locators/${pg}Page.locators.ts`,
            content: pomInput.locatorsCode.trim(),
            type: 'pom',
            metadata: { className: `${pg}PageLocators`, locators: pomInput.locators, snapshotUsed: !!ariaSnapshot }
          }
        };
      }
      yield {
        type: 'file',
        file: {
          path: `pages/${pg}Page.ts`,
          content: pomInput.code.trim(),
          type: 'pom',
          metadata: { className: pomInput.className, locators: pomInput.locators, methods: pomInput.methods, snapshotUsed: !!ariaSnapshot }
        }
      };
    } catch (err: any) {
      yield { type: 'error', message: `Page Object generation failed for ${pg}: ${err.message}` };
    }
  }

  // 2. Generate POMs per page (skip login page when auth is handled separately)
  const allPageNames: string[] = [];

  if (isMultiPage) {
    for (const pageGroup of pages) {
      if (pageGroup.isAuthPage && authInfo.hasAuth) {
        yield { type: 'status', message: `🔐 Skipping login page POM (handled by auth/auth.setup.ts)` };
        continue;
      }
      allPageNames.push(pageGroup.pageName);
      yield* generatePagePom(pageGroup);
    }
  } else {
    // Single-page: use original snapshot approach
    const singleGroup = pages[0] || { url: startUrl, pageName, domain, steps: nlSteps, isAuthPage: authInfo.hasAuth };
    if (singleGroup.isAuthPage && authInfo.hasAuth) {
      yield { type: 'status', message: `🔐 Skipping login page POM (handled by auth/auth.setup.ts)` };
    } else {
      allPageNames.push(singleGroup.pageName);
      yield* generatePagePom(singleGroup);
    }
  }

  // Determine primary page/domain for business actions + test file
  const primaryPageName = allPageNames[0] || pageName;
  const primaryDomain = domain;

  // 3. Business Actions — Extended Thinking + Structured Output
  yield { type: 'status', message: `🧠 Extended Thinking + Structured Output: generating ${primaryDomain}.actions.ts...` };

  // For business actions we pass all page steps (minus pure auth steps)
  const nonAuthSteps = authInfo.hasAuth
    ? nlSteps.filter(s => !authInfo.passwordStep || s !== authInfo.passwordStep)
    : nlSteps;

  // Capture snapshot for first non-auth page for business actions hint
  let baSnapshot = '';
  const firstNonAuthPage = pages.find(p => !p.isAuthPage);
  if (firstNonAuthPage) {
    baSnapshot = await captureAriaSnapshot(firstNonAuthPage.url);
  }

  try {
    const actionsResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 9000,
      thinking:    { type: 'enabled', budget_tokens: 5000 },
      tools:       [TOOL_BUSINESS_ACTIONS],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: buildBusinessActionsPrompt(nonAuthSteps, primaryPageName, primaryDomain, baSnapshot || undefined) }]
    });
    const actionsThinking = extractThinking(actionsResponse.content);
    let actionsInput = extractToolInput<BusinessActionsToolInput>(actionsResponse.content, 'generate_business_actions');
    if (!actionsInput) {
      const textBlock = actionsResponse.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined;
      const rawCode = textBlock?.text || '// Business Actions generation produced no output';
      actionsInput = { code: rawCode, functions: [] };
    }
    if (actionsThinking) {
      yield { type: 'thinking', label: `${primaryDomain}.actions — composition reasoning`, content: actionsThinking };
    }
    yield {
      type: 'file',
      file: {
        path: `actions/business/${primaryDomain}.actions.ts`,
        content: actionsInput.code.trim(),
        type: 'business_action',
        metadata: { functions: actionsInput.functions }
      }
    };
  } catch (err: any) {
    yield { type: 'error', message: `Business Actions generation failed: ${err.message}` };
    return;
  }

  // 4. Test file — Extended Thinking + Structured Output
  // Filter out auth steps from test file (they are handled by auth.setup.ts)
  const testSteps = authInfo.hasAuth
    ? nlSteps.filter(s => {
        if (authInfo.usernameStep && s === authInfo.usernameStep) return false;
        if (authInfo.passwordStep && s === authInfo.passwordStep) return false;
        if (authInfo.submitStep && s === authInfo.submitStep) return false;
        return true;
      })
    : nlSteps;

  yield { type: 'status', message: `🧠 Extended Thinking + Structured Output: generating ${testFileName}.spec.ts...` };
  try {
    const testResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      thinking:    { type: 'enabled', budget_tokens: 3000 },
      tools:       [TOOL_TEST],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: buildTestFilePrompt(testSteps, testName, startUrl, primaryPageName, primaryDomain) }]
    });
    const testThinking = extractThinking(testResponse.content);
    let testInput = extractToolInput<TestToolInput>(testResponse.content, 'generate_test_file');
    if (!testInput) {
      const textBlock = testResponse.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined;
      const rawCode = textBlock?.text || '// Test file generation produced no output';
      testInput = { code: rawCode, testCaseName: testName, businessScenario: '', businessActionsUsed: [], assertionsUsed: [] };
    }
    if (testThinking) {
      yield { type: 'thinking', label: `${testFileName}.spec — test design reasoning`, content: testThinking };
    }
    yield {
      type: 'file',
      file: {
        path: `tests/${testFileName}.spec.ts`,
        content: testInput.code.trim(),
        type: 'test',
        metadata: {
          testCaseName: testInput.testCaseName,
          businessScenario: testInput.businessScenario,
          businessActionsUsed: testInput.businessActionsUsed,
          assertionsUsed: testInput.assertionsUsed
        }
      }
    };
  } catch (err: any) {
    yield { type: 'error', message: `Test file generation failed: ${err.message}` };
    return;
  }

  yield { type: 'status', message: '✅ Framework generation complete!' };
}

// ─── Self-Healing: fix a broken locator via Claude ────────────────────────────

export async function healLocator(
  brokenLocator: string,
  errorMessage: string,
  pageUrl: string,
  domSnapshot: string  // simplified DOM around the failing element
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are a Playwright test automation expert. A locator broke after a UI change.

Broken locator: ${brokenLocator}
Error: ${errorMessage}
Page URL: ${pageUrl}

Current DOM around the target element:
${domSnapshot.slice(0, 3000)}

Generate ONE replacement Playwright locator that will find the same element.
Rules:
- Use getByRole, getByPlaceholder, getByLabel, or getByText — prefer semantic over CSS
- Add .first() if the element might match multiple
- Return ONLY the locator expression, nothing else
- Example: page.getByRole('button', { name: 'Submit', exact: false })

Replacement locator:`
    }]
  });

  return ((response.content[0] as any).text || '').trim();
}
