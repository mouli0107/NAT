import { Page } from '@playwright/test';
import { AppDashboardPage } from '@pages/AppDashboardPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyUrl } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Performs login with username and password, then selects Belgium store 001
 */
export async function loginAndSelectStore(page: Page, data = testData): Promise<void> {
  const pg = new AppDashboardPage(page);
  
  // Navigate to login page
  await pg.navigateToDashboard();
  await waitForNetworkIdle(page);
  await pg.navigateToHome();
  await waitForNetworkIdle(page);
  await pg.navigateToLogin();
  await waitForNetworkIdle(page);
  
  // Fill login credentials
  await pg.clickUsernameField();
  await pg.fillUsername(data.usernameidexampleInputEmail1);
  await pg.clickPasswordField();
  await pg.fillPassword(data.passwordidexampleInputPassword1);
  
  // Navigate to dashboard after password entry
  await pg.navigateToDashboard();
  await waitForNetworkIdle(page);
  
  // Select Belgium store 001
  await pg.clickBelgiumButton();
  await waitForNetworkIdle(page);
  await pg.clickStore001Button();
  await waitForNetworkIdle(page);
  
  // Verify we reached customer search page
  await verifyUrl(page, '/customer-search');
}

/**
 * Searches for a customer by first name and navigates to their profile
 */
export async function searchAndSelectCustomer(page: Page, data = testData): Promise<void> {
  const pg = new AppDashboardPage(page);
  
  // Ensure we're on customer search page
  await pg.navigateToCustomerSearch();
  await waitForNetworkIdle(page);
  
  // Fill search criteria
  await pg.fillFirstName(data.firstNamenamefname);
  await pg.selectCustomerType('All Customer Groups');
  
  // Perform search
  await pg.clickSearchButton();
  await waitForNetworkIdle(page);
  
  // Click on customer result
  await pg.clickHarshJoshiLink();
  await waitForNetworkIdle(page);
  
  // Verify navigation to customer information page
  await verifyUrl(page, '/customer-management/customer-information/9378117');
}

/**
 * Updates an existing customer inquiry with need date, reasons, and objections
 */
export async function updateCustomerInquiry(page: Page, data = testData): Promise<void> {
  const pg = new AppDashboardPage(page);
  
  // Navigate to customer inquiry list
  await pg.navigateToCustomerInquiryList();
  await waitForNetworkIdle(page);
  
  // Open first inquiry
  await pg.clickInquiry1Link();
  await waitForNetworkIdle(page);
  
  // Update inquiry date
  await pg.clickDate27042026();
  await pg.clearNeedDateInput();
  
  // Set inquiry reason
  await pg.selectInquiryWhy('Extra Space');
  await pg.fillInquiryWhyInput(data.inquiryWhyidinquiryWhy);
  await pg.fillEditWhat(data.editWhatnameeditWhat);
  
  // Set inquiry objections
  await pg.selectInquiryObjection('Price');
  await pg.fillInquiryObjectionInput(data.inquiryObjectionidinquiryObjection);
  
  // Set OC objection
  await pg.selectInquiryOCObjection('Other store');
  await pg.fillInquiryOCObjectionInput(data.inquiryOCObjectionidinquiryOCObjection);
  
  // Save the inquiry
  await pg.clickSaveButton();
  await waitForNetworkIdle(page);
}