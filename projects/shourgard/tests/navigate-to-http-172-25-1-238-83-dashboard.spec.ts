import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { loginAndSelectStore, searchAndSelectCustomer, updateCustomerInquiry } from '@actions/business/auth.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Customer Inquiry Management', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshotPath = `test-results/${testInfo.title.replace(/\s+/g, '-')}-failure.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
      console.error(`\n📸 Failure screenshot: ${require('path').resolve(screenshotPath)}\n`);
    }
  });

  test('Login and select store succeeds', async ({ page }) => {
    await test.step('1 · Navigate to dashboard', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Login and select store', () => loginAndSelectStore(page, {
      username: testData.usernameidexampleInputEmail1,
      password: process.env.PASSWORD || testData.passwordidexampleInputPassword1,
      store: 'Belgium - 001'
    }));
    await test.step('4 · Verify navigation to customer search', () => verifyUrl(page, '/customer-search'));
  });

  test('Search and select customer succeeds', async ({ page }) => {
    await test.step('1 · Navigate to dashboard', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Login and select store', () => loginAndSelectStore(page, {
      username: testData.usernameidexampleInputEmail1,
      password: process.env.PASSWORD || testData.passwordidexampleInputPassword1,
      store: 'Belgium - 001'
    }));
    await test.step('4 · Search and select customer', () => searchAndSelectCustomer(page, {
      firstName: testData.firstNamenamefname,
      customerGroup: 'All Customer Groups',
      customerName: 'Harsh Joshi'
    }));
    await test.step('5 · Verify customer information page', () => verifyUrl(page, '/customer-management/customer-information'));
  });

  test('Update customer inquiry succeeds', async ({ page }) => {
    await test.step('1 · Navigate to dashboard', () => navigateTo(page, testData.baseUrl));
    await test.step('2 · Prepare site', () => prepareSite(page));
    await test.step('3 · Login and select store', () => loginAndSelectStore(page, {
      username: testData.usernameidexampleInputEmail1,
      password: process.env.PASSWORD || testData.passwordidexampleInputPassword1,
      store: 'Belgium - 001'
    }));
    await test.step('4 · Search and select customer', () => searchAndSelectCustomer(page, {
      firstName: testData.firstNamenamefname,
      customerGroup: 'All Customer Groups',
      customerName: 'Harsh Joshi'
    }));
    await test.step('5 · Update customer inquiry', () => updateCustomerInquiry(page, {
      inquiryName: 'Inquiry 1',
      needDate: '27-04-2026',
      inquiryWhy: testData.inquiryWhyidinquiryWhy,
      editWhat: testData.editWhatnameeditWhat,
      inquiryObjection: testData.inquiryObjectionidinquiryObjection,
      inquiryOCObjection: testData.inquiryOCObjectionidinquiryOCObjection
    }));
    await test.step('6 · Verify inquiry saved', () => verifyVisible(page, 'text=SAVE'));
  });
});