import { test, expect } from '@playwright/test';
import { navigateTo, clickLink } from '@actions/generic/browser.actions';
import { viewAgileDevelopmentServices, navigateToNews } from '@actions/business/nousinfosystemspage.actions';
import { verifyUrl } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';

test.describe('Navigate to https://www.nousinfosystems.com/', () => {
  const data = getTestData('Navigateto');

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  test('Navigate to https://www.nousinfosystems.com/', async ({ page }) => {
    await test.step('1 · Navigate to https://www.nousinfosystems.com/', () => 
      navigateTo(page, data.baseUrl)
    );

    await test.step('2 · Navigate to https://www.nousinfosystems.com/services/agile-development', () => 
      viewAgileDevelopmentServices(page, data)
    );

    await test.step('3 · Click link "News"', () => 
      navigateToNews(page, data)
    );

    await test.step('4 · Verify navigation to News page', () => 
      verifyUrl(page, 'news')
    );
  });
});