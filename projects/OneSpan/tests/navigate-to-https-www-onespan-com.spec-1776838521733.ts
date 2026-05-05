import { test } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { prepareSite, waitForPageReady } from '../helpers/universal';
import { navigateToRequestDemo, fillDemoRequestForm, submitDemoRequest } from '@actions/business/contact.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Request Product Demo', () => {
  test('Submit demo request form and verify submission', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);

    await navigateToRequestDemo(page);
    await prepareSite(page);

    await fillDemoRequestForm(page, {
      email: testData.businessEmail,
      firstName: testData.firstName,
      lastName: testData.lastName,
      company: testData.companyName,
      industry: testData.industry,
      phone: testData.phoneNumber,
      country: testData.country,
      businessInterest: testData.businessInterest,
      comments: testData.comments
    });

    await submitDemoRequest(page);
    await prepareSite(page);

    await verifyUrl(page, testData.expectedConfirmationUrl);
    await verifyVisible(page, testData.successMessageSelector);
    await verifyText(page, testData.confirmationMessageSelector, testData.expectedConfirmationText);
  });
});