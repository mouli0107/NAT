import { test } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait } from '../helpers/universal';
import { clickSolutionsMenu, selectStrongCustomerAuthentication, clickGetStartedAuthentication, navigateToDemoRequest, fillDemoRequestForm, submitDemoRequest } from '@actions/business/contact.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Demo Request Submission', () => {
  test('Submit demo request for authentication product and verify confirmation', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);
    
    await clickSolutionsMenu(page);
    await selectStrongCustomerAuthentication(page);
    await clickGetStartedAuthentication(page);
    await navigateToDemoRequest(page);
    
    await fillDemoRequestForm(page, {
      firstName: testData.demoRequest.firstName,
      lastName: testData.demoRequest.lastName,
      email: testData.demoRequest.email,
      company: testData.demoRequest.company,
      industry: testData.demoRequest.industry,
      phone: testData.demoRequest.phone,
      country: testData.demoRequest.country,
      businessInterest: testData.demoRequest.businessInterest,
      comments: testData.demoRequest.comments
    });
    
    await submitDemoRequest(page);
    
    await verifyUrl(page, testData.urls.demoThankYou);
    await verifyVisible(page, testData.selectors.demoSuccessMessage);
  });
});