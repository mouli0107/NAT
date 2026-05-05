import { test } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait } from '../helpers/universal';
import { exploreSiteNavigation, navigateToRequestDemo, closeDemoModal, fillDemoRequestForm, submitDemoRequest } from '@actions/business/contact.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Demo Request Submission', () => {
  test('Submit demo request form with complete customer information', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);
    
    await exploreSiteNavigation(page);
    await navigateToRequestDemo(page);
    await closeDemoModal(page);
    
    await fillDemoRequestForm(page, {
      email: testData.email,
      firstName: testData.firstName,
      lastName: testData.lastName,
      company: testData.company,
      industry: testData.industry,
      phone: testData.phone,
      country: testData.country,
      businessInterest: testData.businessInterest,
      comments: testData.comments
    });
    
    await submitDemoRequest(page);
    
    await verifyUrl(page, testData.demoConfirmationUrl);
    await verifyVisible(page, testData.demoSuccessMessageSelector);
    await verifyText(page, testData.demoSuccessMessageSelector, testData.demoSuccessMessage);
  });
});