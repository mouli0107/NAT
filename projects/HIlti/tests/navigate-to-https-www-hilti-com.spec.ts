import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateToHomeAndAcceptCookies, browseToPowerToolsAndChangeCountry, navigateToControlCostsViaEngineering, addExoskeletonToCart } from '@actions/business/checkout.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';

test.describe('Hilti Exoskeleton Product Purchase Flow', () => {
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
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Accept cookies and verify homepage', () => navigateToHomeAndAcceptCookies(page, data));
    await test.step('4 · Verify homepage URL', () => verifyUrl(page, data.baseUrl));
    await test.step('5 · Verify homepage content is visible', () => verifyVisible(page, 'Products'));
  });

  test('Navigating to Power Tools and changing country succeeds', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Accept cookies', () => navigateToHomeAndAcceptCookies(page, data));
    await test.step('4 · Browse to Power Tools and change country', () => browseToPowerToolsAndChangeCountry(page, data));
    await test.step('5 · Verify navigation completed', () => verifyVisible(page, 'Engineering Centre'));
  });

  test('Control Costs page displays expected sections', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Accept cookies', () => navigateToHomeAndAcceptCookies(page, data));
    await test.step('4 · Browse to Power Tools and change country', () => browseToPowerToolsAndChangeCountry(page, data));
    await test.step('5 · Navigate to Control Costs via Engineering', () => navigateToControlCostsViaEngineering(page, data));
    await test.step('6 · Verify Control Costs content', () => verifyVisible(page, 'Control Costs'));
  });

  test('EXO-S Shoulder Exoskeleton can be added to cart', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Accept cookies', () => navigateToHomeAndAcceptCookies(page, data));
    await test.step('4 · Add exoskeleton product to cart', () => addExoskeletonToCart(page, data));
    await test.step('5 · Verify product was added to cart', () => verifyVisible(page, 'EXO-S Shoulder Exoskeleton'));
  });
});