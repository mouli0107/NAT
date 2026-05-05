import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateToContactForm, submitContactForm, completeContactFormFlow } from '@actions/business/contact.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { getTestData } from '@fixtures/excel-reader';

test.describe('Contact Form Submission Flow', () => {
  const data = getTestData('TC_Navigate');

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
    await test.step('3 · Verify homepage is visible', () => verifyVisible(page, 'homepage'));
    await test.step('4 · Verify URL is correct', () => verifyUrl(page, data.baseUrl));
  });

  test('Navigating to contact form succeeds', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Navigate to contact form', () => navigateToContactForm(page, data));
    await test.step('4 · Verify contact page URL', () => verifyUrl(page, '/contact-us'));
    await test.step('5 · Verify contact form is visible', () => verifyVisible(page, 'contact form'));
  });

  test('Contact form can be submitted with valid data', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Navigate to contact form', () => navigateToContactForm(page, data));
    await test.step('4 · Submit contact form with test data', () => submitContactForm(page, data));
    await test.step('5 · Verify form submission success', () => verifyUrl(page, '#wpcf7-f89-o1'));
  });

  test('Complete contact form flow end-to-end', async ({ page }) => {
    await test.step('1 · Navigate to homepage', () => navigateTo(page, data.baseUrl));
    await test.step('2 · Accept cookies / prepare site', () => prepareSite(page));
    await test.step('3 · Complete entire contact form flow', () => completeContactFormFlow(page, data));
    await test.step('4 · Verify successful submission', () => verifyUrl(page, '#wpcf7-f89-o1'));
    await test.step('5 · Verify confirmation is visible', () => verifyVisible(page, 'confirmation'));
  });
});