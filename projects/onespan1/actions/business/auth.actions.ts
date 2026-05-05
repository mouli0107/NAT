import { Page } from '@playwright/test';
import { OnespanHomePage } from '@pages/OnespanHomePage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyText, verifyUrl, verifyVisible, verifyEnabled, verifyDisabled,
         verifyChecked, verifyUnchecked, verifyInputValue, verifyInputContains,
         verifyAttribute, verifyCount } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Navigate to FIDO Hardware Authenticators product page
 */
export async function navigateToFIDOAuthenticators(page: Page, data = testData): Promise<void> {
  const onespanPage = new OnespanHomePage(page);
  
  // Navigate to the main page
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  // Click on FIDO Hardware Authenticators link
  await onespanPage.clickFIDOHardwareAuthenticatorsLink();
  await waitForNetworkIdle(page);
  
  // Verify we're on the right page by checking URL contains expected path
  await verifyUrl(page, 'fido');
}

/**
 * Navigate to Community Portal through Resources menu
 */
export async function navigateToCommunityPortal(page: Page, data = testData): Promise<void> {
  const onespanPage = new OnespanHomePage(page);
  
  // Click Resources button to open menu
  await onespanPage.clickResourcesButton();
  await waitForNetworkIdle(page);
  
  // Click Community Portal link
  await onespanPage.clickCommunityPortalLink();
  await waitForNetworkIdle(page);
  
  // Click Company button to open popup
  await onespanPage.clickCompanyButton();
  await waitForNetworkIdle(page);
  
  // Verify navigation to community portal
  await verifyUrl(page, 'community.onespan.com');
}

/**
 * Submit contact form with business information
 */
export async function submitContactForm(page: Page, data = testData): Promise<void> {
  const onespanPage = new OnespanHomePage(page);
  
  // Click Contact Us link
  await onespanPage.clickContactUsLink();
  await waitForNetworkIdle(page);
  
  // Fill in the contact form fields
  await onespanPage.clickFirstNameField();
  await onespanPage.enterFirstName(data.FirstNameidFirstName);
  
  await onespanPage.clickBusinessEmailField();
  await onespanPage.enterEmail(data.EmailAddressidEmail);
  
  await onespanPage.enterLastName(data.LastNameidLastName);
  await onespanPage.enterTitle(data.TitleidTitle);
  
  // Select industry dropdowns
  await onespanPage.selectIndustry('Transport & Logistics');
  await onespanPage.selectIndustry('Technology');
  
  await onespanPage.enterCompanyName(data.CompanyNameidCompany);
  await onespanPage.enterPhoneNumber(data.PhoneNumberidPhone);
  
  // Select business interest and country
  await onespanPage.selectBusinessInterest('Cloud Authentication');
  await onespanPage.selectCountry('Azerbaijan');
  
  // Add optional comments
  await onespanPage.clickCommentsField();
  await onespanPage.enterComments(data.CommentsidWebFormCommentsC);
  
  // Wait for form submission to complete
  await waitForNetworkIdle(page);
  
  // Verify successful submission by checking for confirmation message or URL change
  await verifyUrl(page, 'thank');
}

export async function verifyAuth(page: Page): Promise<void> {
  // Assert "Reque t a demo" is visible
  await verifyText(page, 'Reque t a demo');
  // Assert "Featured  ervice " is visible
  await verifyText(page, 'Featured  ervice ');
  // Assert "Company" is hidden
  await expect(page.getByText('Company', { exact: false }).first()).not.toBeVisible();
}