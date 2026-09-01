import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { navigateToCommercialPiping, exploreEngineeringCenter, acceptCookiesAndVerifyHomepage } from '@actions/business/hiltihome.actions';
import { verifyVisible, verifyUrl } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';

test.describe('Navigate to Hilti.com and explore solutions', () => {
  const data = getTestData('TC001');

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  test('Navigate to https://www.hilti.com/', async ({ page }) => {
    await test.step('1 · Navigate to https://www.hilti.com/', () => navigateTo(page, data.baseUrl));
    
    await test.step('2 · Accept cookies and verify homepage', () => acceptCookiesAndVerifyHomepage(page, data));
    
    await test.step('3 · Verify "Products" is visible', () => verifyVisible(page, 'Products'));
    
    await test.step('4 · Navigate to Commercial Piping solution', () => navigateToCommercialPiping(page, data));
    
    await test.step('5 · Explore Engineering Center', () => exploreEngineeringCenter(page, data));
    
    await test.step('6 · Verify final URL contains articles', () => verifyUrl(page, 'articles'));
  });
});