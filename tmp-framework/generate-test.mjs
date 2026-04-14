/**
 * Generates a real Playwright TypeScript test file for the insurance portal
 * user story, using actual function signatures from the parsed framework catalog.
 *
 * User Story:
 *   As a policyholder, I want to log in to the insurance portal using my
 *   registered email and password, so that I can securely access my policy
 *   details, claims, and account settings.
 *
 * Framework: idavidov13/Playwright-Framework (GitHub)
 * Source: github.com/idavidov13/Playwright-Framework
 */

const CONFIG_ID = '3a8cb681-fe77-42a7-8cbb-3bc7ed2b83d2';

async function getCatalog() {
  const r = await fetch(`http://localhost:5000/api/framework-config/${CONFIG_ID}`);
  const d = await r.json();
  return d.functions ?? [];
}

async function main() {
  const catalog = await getCatalog();

  console.log(`\n📚 Framework Catalog loaded — ${catalog.length} functions available:`);
  catalog.forEach(fn => {
    const params = Array.isArray(fn.parameters)
      ? fn.parameters.map(p => `${p.name}: ${p.type}`).join(', ')
      : fn.parameters ?? '';
    console.log(`   [${fn.category}] ${fn.className}.${fn.name}(${params})`);
  });

  // ─── User Story & Test Cases ─────────────────────────────────────────────
  const story = {
    id:    'INS-US-001',
    title: 'Insurance Portal Login',
    epic:  'Policyholder Authentication',
    description: `As a policyholder, I want to log in to the insurance portal
using my registered email and password, so that I can securely access
my policy details, claims, and account settings.`,
    acceptanceCriteria: [
      'AC1: Valid credentials → redirect to personalised home dashboard with user name visible in nav',
      'AC2: Invalid password → sign-in page stays visible with error message',
      'AC3: Empty email/password → form validation prevents submission',
      'AC4: Authenticated user clicks Logout → redirected to guest home page',
      'AC5: Navigating directly to Sign-In URL → sign-in page title visible',
    ],
    testCases: [
      { id: 'TC-001', title: 'Login with valid credentials',       type: 'FUN', priority: 'P1' },
      { id: 'TC-002', title: 'Login with invalid password',        type: 'NEG', priority: 'P1' },
      { id: 'TC-003', title: 'Login with empty email',             type: 'NEG', priority: 'P2' },
      { id: 'TC-004', title: 'Login with empty password',          type: 'NEG', priority: 'P2' },
      { id: 'TC-005', title: 'Logout after successful login',      type: 'FUN', priority: 'P1' },
      { id: 'TC-006', title: 'Navigate to Sign-In page directly',  type: 'FUN', priority: 'P2' },
      { id: 'TC-007', title: 'Session persists on home page reload', type: 'REG', priority: 'P2' },
    ],
  };

  // ─── Generate Playwright TypeScript test file ────────────────────────────
  const ts = generateTestFile(story, catalog);

  // Write to file
  const { writeFileSync } = await import('fs');
  const outPath = './output/INS-US-001_insurance_portal_login.spec.ts';
  writeFileSync(new URL(outPath, import.meta.url), ts, 'utf8');
  console.log(`\n✅ Test file written → ${outPath}`);
  console.log('\n' + '='.repeat(80));
  console.log(ts);
}

function generateTestFile(story, catalog) {
  // Map function names to catalog entries for easy lookup
  const fn = {};
  catalog.forEach(f => { fn[f.name] = f; });

  return `/**
 * ============================================================
 *  Test Suite  : ${story.title}
 *  Story ID    : ${story.id}
 *  Epic        : ${story.epic}
 *  Framework   : Playwright + TypeScript (Page Object Model)
 *  Source Repo : github.com/idavidov13/Playwright-Framework
 *  Generated   : ${new Date().toISOString().split('T')[0]} by NAT (NaT20 AI Test Platform)
 * ============================================================
 *
 *  Story:
 *  ${story.description.split('\n').join('\n *  ')}
 *
 *  Acceptance Criteria:
 ${story.acceptanceCriteria.map(ac => ` *    ${ac}`).join('\n')}
 *
 *  Test Cases Covered:
 ${story.testCases.map(tc => ` *    [${tc.type}][${tc.priority}] ${tc.id}: ${tc.title}`).join('\n')}
 * ============================================================
 */

import { test, expect }  from '../fixtures/page-object-fixture';

// ─── Test Data ────────────────────────────────────────────────────────────────
const VALID_USER = {
  email    : process.env.EMAIL    ?? 'policyholder@insurance.com',
  password : process.env.PASSWORD ?? 'SecureP@ssw0rd',
  userName : process.env.USER_NAME ?? 'John Policyholder',
};

const INVALID_CREDS = {
  email   : 'policyholder@insurance.com',
  password: 'WrongPassword123!',
};

// ─── Test Suite ───────────────────────────────────────────────────────────────
test.describe('${story.id} — ${story.title}', () => {

  /**
   * TC-001 [FUN][P1]
   * Verify that a policyholder can log in with valid credentials
   * and is redirected to the personalised home dashboard.
   *
   * AC1: Valid credentials → redirect to personalised home dashboard
   *      with user name visible in the navigation bar.
   */
  test('TC-001: Login with valid credentials', async ({ homePage, navPage }) => {
    // Step 1 — Navigate to the home page as a guest
    await homePage.navigateToHomePageGuest();

    // Step 2 — Navigate to the Sign-In page from the nav bar
    await navPage.navigateToSignInPage();

    // Step 3 — Assert the Sign-In page is displayed
    await navPage.verifySignInPageIsDisplayed();

    // Step 4 — Log in with valid policyholder credentials
    await navPage.logIn(VALID_USER.email, VALID_USER.password);

    // Step 5 — Verify the user is now logged in (user name visible in nav)
    await navPage.verifyUserIsLoggedIn(VALID_USER.userName);

    // Step 6 — Verify the authenticated home page is displayed
    await homePage.navigateToHomePageUser();
  });

  /**
   * TC-002 [NEG][P1]
   * Verify that login fails gracefully when an invalid password is provided.
   *
   * AC2: Invalid password → sign-in page stays visible with an error message.
   */
  test('TC-002: Login with invalid password', async ({ homePage, navPage, page }) => {
    // Step 1 — Navigate to the home page as a guest
    await homePage.navigateToHomePageGuest();

    // Step 2 — Navigate to the Sign-In page
    await navPage.navigateToSignInPage();

    // Step 3 — Attempt login with incorrect password
    await page.getByRole('textbox', { name: 'Email' }).fill(INVALID_CREDS.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(INVALID_CREDS.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Step 4 — Verify the Sign-In page is still displayed (login rejected)
    await navPage.verifySignInPageIsDisplayed();

    // Step 5 — Verify an error message is visible to the user
    await expect(
      page.locator('[data-testid="login-error"], .error-messages, .alert-danger').first()
    ).toBeVisible({ timeout: 5000 });
  });

  /**
   * TC-003 [NEG][P2]
   * Verify that the login form rejects submission when email is empty.
   *
   * AC3: Empty email → form validation prevents submission.
   */
  test('TC-003: Login with empty email field', async ({ homePage, navPage, page }) => {
    // Step 1 — Navigate to the home page as a guest
    await homePage.navigateToHomePageGuest();

    // Step 2 — Navigate to Sign-In page
    await navPage.navigateToSignInPage();

    // Step 3 — Fill only the password, leave email empty
    await page.getByRole('textbox', { name: 'Password' }).fill(VALID_USER.password);

    // Step 4 — Attempt to click Sign in
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Step 5 — Verify Sign-In page is still visible (not redirected)
    await navPage.verifySignInPageIsDisplayed();

    // Step 6 — Email field should still be empty / invalid
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeEmpty();
  });

  /**
   * TC-004 [NEG][P2]
   * Verify that the login form rejects submission when password is empty.
   *
   * AC3: Empty password → form validation prevents submission.
   */
  test('TC-004: Login with empty password field', async ({ homePage, navPage, page }) => {
    // Step 1 — Navigate to the home page as a guest
    await homePage.navigateToHomePageGuest();

    // Step 2 — Navigate to Sign-In page
    await navPage.navigateToSignInPage();

    // Step 3 — Fill only the email, leave password empty
    await page.getByRole('textbox', { name: 'Email' }).fill(VALID_USER.email);

    // Step 4 — Attempt to click Sign in
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Step 5 — Verify Sign-In page is still visible
    await navPage.verifySignInPageIsDisplayed();

    // Step 6 — Password field should still be empty / invalid
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeEmpty();
  });

  /**
   * TC-005 [FUN][P1]
   * Verify that an authenticated user can log out successfully
   * and is redirected back to the guest home page.
   *
   * AC4: Authenticated user clicks Logout → redirected to guest home page.
   */
  test('TC-005: Logout after successful login', async ({ homePage, navPage }) => {
    // Step 1 — Navigate to home as guest
    await homePage.navigateToHomePageGuest();

    // Step 2 — Log in with valid credentials
    await navPage.logIn(VALID_USER.email, VALID_USER.password);

    // Step 3 — Verify user is logged in
    await navPage.verifyUserIsLoggedIn(VALID_USER.userName);

    // Step 4 — Perform logout via Settings → Logout
    await navPage.logOut();

    // Step 5 — Verify the guest home banner is visible (unauthenticated state)
    await homePage.verifyHomeBannerIsVisible();
  });

  /**
   * TC-006 [FUN][P2]
   * Verify that navigating directly to the Sign-In page displays the
   * sign-in form with the correct page title.
   *
   * AC5: Navigating directly to Sign-In URL → sign-in page title visible.
   */
  test('TC-006: Navigate directly to Sign-In page', async ({ navPage, page }) => {
    // Step 1 — Navigate directly to Sign-In URL
    await page.goto(\`\${process.env.URL}/login\`, { waitUntil: 'networkidle' });

    // Step 2 — Verify the Sign-In page title is displayed
    await navPage.verifySignInPageIsDisplayed();

    // Step 3 — Verify the Email and Password inputs are present
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  /**
   * TC-007 [REG][P2]
   * Verify that the authenticated session persists when the home page is reloaded.
   *
   * Regression guard: session cookie / storage must survive a page reload.
   */
  test('TC-007: Session persists after page reload', async ({ homePage, navPage, page }) => {
    // Step 1 — Navigate to home as guest
    await homePage.navigateToHomePageGuest();

    // Step 2 — Log in with valid credentials
    await navPage.logIn(VALID_USER.email, VALID_USER.password);

    // Step 3 — Verify authenticated state
    await navPage.verifyUserIsLoggedIn(VALID_USER.userName);

    // Step 4 — Reload the page
    await page.reload({ waitUntil: 'networkidle' });

    // Step 5 — Verify user is still authenticated after reload
    await navPage.verifyUserIsLoggedIn(VALID_USER.userName);

    // Step 6 — Verify authenticated home page (personalised feed visible)
    await homePage.navigateToHomePageUser();
  });

});
`;
}

main().catch(console.error);
