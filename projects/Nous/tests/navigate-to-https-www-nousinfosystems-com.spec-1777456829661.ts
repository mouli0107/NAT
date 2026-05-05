import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { exploreCompanyAndPartnerships, navigateToBankingServices, navigateToAICompetency, verifyNousinfosystemspage } from '@actions/business/nousinfosystemspage.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Nous Infosystems Site Navigation and Content Verification', () => {
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
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Verify Nous Infosystems page content', () => verifyNousinfosystemspage(page));
  });

  test('Banking & Financial Services section is accessible', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Navigate to Banking & Financial Services', () => navigateToBankingServices(page));
    await test.step('4 · Verify navigation to banking services', () => verifyVisible(page, 'Banking & Financial Services'));
  });

  test('AI & Automation competency section is accessible', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Navigate to AI & Automation competency', () => navigateToAICompetency(page));
    await test.step('4 · Verify AI competency section is visible', () => verifyVisible(page, 'AI & Automation'));
  });

  test('Company and partnerships information displays AWS', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Explore company and partnerships section', () => exploreCompanyAndPartnerships(page));
    await test.step('4 · Verify AWS partnership is visible', () => verifyVisible(page, 'AWS'));
  });
});