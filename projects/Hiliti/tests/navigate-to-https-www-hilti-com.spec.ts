import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateAndAcceptCookies, setupHiltiSite, verifyHiltihome } from '@actions/business/hiltihome.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';

test.describe('Hilti Homepage Navigation and Setup', () => {
  const data = getTestData('Navigateto');

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  test('Page loads and displays key content', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Navigate and accept cookies', () => navigateAndAcceptCookies(page, data));
    await test.step('4 · Verify homepage content is displayed', () => verifyHiltihome(page, data));
  });

  test('Site setup completes successfully', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Setup Hilti site', () => setupHiltiSite(page, data));
    await test.step('4 · Verify URL is correct', () => verifyUrl(page, data.baseUrl));
  });

  test('Product section is enabled after accepting cookies', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Navigate and accept cookies', () => navigateAndAcceptCookies(page, data));
    await test.step('4 · Verify Product text is visible', () => verifyText(page, 'Product'));
  });
});