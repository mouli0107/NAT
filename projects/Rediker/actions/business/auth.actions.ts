import { Page } from '@playwright/test';
import { navigateTo, clickButton, clickLink, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { fillField } from '@actions/generic/form.actions';
import { verifyUrl } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Authenticates a user by logging into the application with valid credentials
 */
export async function loginAsApplicant(page: Page, data = testData) {
  // Navigate to the application login page
  await navigateTo(page, data.auth.loginUrl);
  await waitForNetworkIdle(page);

  // Enter user email address
  await page.locator('#txtUserName').click();
  await fillField(page, 'Enter your email', data.auth.email);

  // Enter user password
  await page.locator('text=Enter your password').click();
  await fillField(page, 'Enter your password', data.auth.password);

  // Submit login credentials
  await clickButton(page, 'Login');
  await waitForNetworkIdle(page);

  // Verify successful authentication by confirming redirect to applicant landing page
  await verifyUrl(page, data.auth.landingPageUrl);
}

/**
 * Logs out the currently authenticated user from the application
 */
export async function logoutFromApplication(page: Page, data = testData) {
  // Open user profile menu
  await page.locator(`text=${data.auth.userName}`).click();

  // Click logout option
  await clickLink(page, 'Log Out');
  await waitForNetworkIdle(page);

  // Verify user is redirected to login page after logout
  await verifyUrl(page, data.auth.loginUrl);
}