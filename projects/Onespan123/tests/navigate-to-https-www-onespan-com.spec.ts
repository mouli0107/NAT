import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateToProducts, navigateToHomePage, verifyOnespanhome } from '@actions/business/onespanhome.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Onespan Products Navigation', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  test('Page loads and displays key content', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Verify Onespan homepage content', () => verifyOnespanhome(page));
  });

  test('Navigating to Products succeeds', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Navigate to Products', () => navigateToProducts(page));
    await test.step('4 · Verify "Solution" text is visible', () => verifyVisible(page, 'Solution'));
  });
});