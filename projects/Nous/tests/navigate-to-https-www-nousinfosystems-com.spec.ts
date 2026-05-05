// Layer 5 — Test Specifications
// RULES (Generator Standards Rule 11, 12, 13, 14):
//   - One test() per scenario — atomic, independently runnable
//   - No XPath/CSS selectors in this file — all selectors live in locators/
//   - No unused parameters (context removed)
//   - Always: navigateTo → prepareSite → business actions
import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import {
  verifyNousinfosystemshome,
  navigateToDataVisualization,
  reviewDataVisualizationCapabilities,
} from '@actions/business/nousinfosystemshome.actions';
import { verifyUrl, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('NousInfoSystems — Data Visualization Services', () => {

  // FIX 12: afterEach captures screenshot + absolute path on any failure
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      // eslint-disable-next-line no-console
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  // ── Test 1 of 3 ─────────────────────────────────────────────────────────────
  // Verifies that the home page loads and key content is visible.
  // FIX 14: no unused `context` parameter
  test('Home page loads and displays key content', async ({ page }) => {
    await test.step('1 · Navigate to home page',          () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Dismiss consent banners / wait', () => prepareSite(page));
    await test.step('3 · Verify home page content',       () => verifyNousinfosystemshome(page));
  });

  // ── Test 2 of 3 ─────────────────────────────────────────────────────────────
  // Verifies that the Services nav path successfully reaches the Data Visualization page.
  test('Navigating to Data Visualization page succeeds', async ({ page }) => {
    await test.step('1 · Navigate to home page',           () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Dismiss consent banners / wait',  () => prepareSite(page));
    await test.step('3 · Navigate via Services nav',       () => navigateToDataVisualization(page));
    await test.step('4 · Verify data visualization URL',   () => verifyUrl(page, '/data-visualization'));
  });

  // ── Test 3 of 3 ─────────────────────────────────────────────────────────────
  // Verifies that all capability accordion sections are present and key content is visible.
  // FIX 6: removed phantom [data-testid="data-visualization-content"] — does not exist on page
  test('Data Visualization page displays all capability sections', async ({ page }) => {
    await test.step('1 · Navigate to home page',               () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Dismiss consent banners / wait',      () => prepareSite(page));
    await test.step('3 · Review all capability sections',      () => reviewDataVisualizationCapabilities(page));
    await test.step('4 · Verify custom accelerators heading',  () => verifyText(page, 'Custom accelerators, assured results'));
    await test.step('5 · Verify brochure resource present',    () => verifyText(page, 'Brochure'));
  });

});
