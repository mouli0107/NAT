import { test } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait } from '../helpers/universal';
import { 
  exploreProductsMenu, 
  exploreSolutionsMenu, 
  exploreResourcesMenu, 
  exploreCompanyMenu,
  openDemoRequestForm,
  fillDemoRequestForm,
  submitDemoRequest 
} from '@actions/business/auth.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('OneSpan Demo Request Flow', () => {
  test('Explore website navigation and submit demo request form with complete business information', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);

    await exploreProductsMenu(page, 'FIDO Hardware Authenticators');
    await exploreSolutionsMenu(page, 'Secure Transaction Signing');
    await exploreResourcesMenu(page, 'Blog');
    await exploreCompanyMenu(page, 'Careers');

    await openDemoRequestForm(page);

    await fillDemoRequestForm(page, {
      firstName: testData.demoRequest.firstName,
      lastName: testData.demoRequest.lastName,
      email: testData.demoRequest.email,
      company: testData.demoRequest.company,
      phone: testData.demoRequest.phone,
      country: testData.demoRequest.country,
      industry: testData.demoRequest.industry,
      businessInterest: testData.demoRequest.businessInterest,
      comments: testData.demoRequest.comments
    });

    await submitDemoRequest(page);

    await verifyUrl(page, '/thank-you');
    await verifyVisible(page, '[data-testid="confirmation-message"]');
    await verifyText(page, testData.demoRequest.firstName);
  });
});