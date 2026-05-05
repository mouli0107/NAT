import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateToFIDOAuthenticators, navigateToCommunityPortal, submitContactForm, verifyAuth } from '@actions/business/auth.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('OneSpan Contact Form Submission', () => {
  test('Submit contact form via FIDO authenticators and community portal', async ({ page, context }) => {
    // Navigate to the main site
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);

    // Navigate through FIDO authenticators section
    await navigateToFIDOAuthenticators(page, {
      baseUrl: testData.baseUrl
    });

    // Verify FIDO page elements are visible
    await verifyVisible(page, 'Reque t a demo');
    await verifyVisible(page, 'Featured  ervice ');

    // Navigate to community portal
    await navigateToCommunityPortal(page, {
      baseUrl: testData.baseUrl
    });

    // Submit the contact form with test data
    await submitContactForm(page, {
      firstName: testData.FirstNameidFirstName,
      lastName: testData.LastNameidLastName,
      email: testData.EmailAddressidEmail,
      title: testData.TitleidTitle,
      company: testData.CompanyNameidCompany,
      phone: testData.PhoneNumberidPhone,
      industry: 'Technology',
      businessInterest: 'Cloud Authentication',
      country: 'Azerbaijan',
      comments: testData.CommentsidWebFormCommentsC
    });

    // Verify successful form submission
    await verifyUrl(page, 'contact');
    await verifyAuth(page, {
      expectedUser: testData.EmailAddressidEmail
    });
  });
});