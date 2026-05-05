import { Page } from '@playwright/test';
import { NousinfosystemsContactPage } from '@pages/NousinfosystemsContactPage';
import { InfrastructureManagementPage } from '@pages/InfrastructureManagementPage';
import { CareersPage } from '@pages/CareersPage';
import { ContactUsPage } from '@pages/ContactUsPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyUrl } from '@actions/generic/assert.actions';
import { getTestData, TestDataRow } from '@fixtures/excel-reader';

/**
 * Navigate to the contact form through the Careers menu
 */
export async function navigateToContactForm(page: Page, data: TestDataRow): Promise<void> {
  // Navigate to the home page
  const pgNousinfosystemsContact = new NousinfosystemsContactPage(page);
  await pgNousinfosystemsContact.navigateToHomepage();
  await waitForNetworkIdle(page);
  
  // Navigate to infrastructure management page
  await pgNousinfosystemsContact.navigateToInfrastructureManagement();
  await waitForNetworkIdle(page);
  
  // Click on Careers link from infrastructure management page
  const pgInfrastructureManagement = new InfrastructureManagementPage(page);
  await pgInfrastructureManagement.clickCareers();
  await waitForNetworkIdle(page);
  
  // Click on Contact Us link from careers page
  const pgCareers = new CareersPage(page);
  await pgCareers.clickContactUs();
  await waitForNetworkIdle(page);
  
  // Verify we're on the contact page
  await verifyUrl(page, '/contact-us');
}

/**
 * Fill and submit the contact form with user information
 */
export async function submitContactForm(page: Page, data: TestDataRow): Promise<void> {
  const pgContactUs = new ContactUsPage(page);
  
  // Fill in the contact form fields
  await pgContactUs.fillName(data.namenameyourName);
  await pgContactUs.fillEmail(data.emailnameyourEmail);
  await pgContactUs.fillPhoneNumber(data.phoneNumberidphoneNumberInput);
  await pgContactUs.fillCompanyName(data.companyNamenameyourSubject);
  await pgContactUs.fillMessage(data.messagenameyourMessage);
  
  // Check the consent checkbox
  await pgContactUs.enableCheckbox815();
  
  // After form submission, the page navigates to an anchor
  await waitForNetworkIdle(page);
  
  // Verify the form submission by checking the URL contains the form anchor
  await verifyUrl(page, '/contact-us#wpcf7-f89-o1');
}

/**
 * Complete contact form flow from navigation to submission
 */
export async function completeContactFormFlow(page: Page, data: TestDataRow): Promise<void> {
  // Navigate to the contact form
  await navigateToContactForm(page, data);
  
  // Fill and submit the form
  await submitContactForm(page, data);
}