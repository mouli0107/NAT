import { test, expect } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { navigateToContactPage } from '@actions/business/artizenthome.actions';
import { verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';

test.describe('TC001 - Navigate to Artizent Home Page', () => {
  const data = getTestData('TC001');

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  test('Navigate to https://artizent.com/', async ({ page }) => {
    await test.step('1 · Navigate to https://artizent.com', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Verify homepage loaded successfully', () => verifyUrl(page, data.baseUrl));
    await test.step('3 · Verify homepage key content is visible', () => verifyVisible(page, data));
  });
});