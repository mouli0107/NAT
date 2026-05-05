import { Page } from '@playwright/test';
import { navigateTo, clickButton, clickLink, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { fillField, selectOption } from '@actions/generic/form.actions';
import { verifyUrl } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Complete end-to-end demo request flow: navigate to demo page and submit form
 */
export async function requestProductDemo(page: Page, data = testData) {
  // Navigate to the demo request page
  await navigateTo(page, 'https://www.onespan.com/products/request-a-demo');
  await waitForNetworkIdle(page);

  // Wait for the embedded form iframe to load
  await page.waitForSelector('iframe');
  const formFrame = page.frameLocator('iframe').first();

  // Fill out the demo request form
  await formFrame.locator('#FirstName').fill(data.contact.firstName);
  await formFrame.locator('#LastName').fill(data.contact.lastName);
  await formFrame.locator('#Email').fill(data.contact.email);
  await formFrame.locator('#Company').fill(data.contact.company);
  
  // Select industry from dropdown
  await formFrame.locator('#Industry').selectOption(data.contact.industry);
  
  await formFrame.locator('#Phone').fill(data.contact.phone);
  
  // Select country from dropdown
  await formFrame.locator('#Country').selectOption(data.contact.countryCode);
  
  // Select business interest from dropdown
  await formFrame.locator('#Business_Interest__c').selectOption(data.contact.businessInterest);
  
  await formFrame.locator('#Web_Form_Comments__c').fill(data.contact.comments);

  // Submit the form
  await formFrame.locator('button:has-text("Submit")').click();
  await waitForNetworkIdle(page);

  // Verify successful submission by checking redirect to thank you page
  await verifyUrl(page, 'https://www.onespan.com/products/request-a-demo/thank-you');
}

/**
 * Fill and submit demo request form (assumes user is already on the demo page)
 */
export async function submitDemoRequestForm(page: Page, data = testData) {
  // Wait for the embedded form iframe to load
  await page.waitForSelector('iframe');
  const formFrame = page.frameLocator('iframe').first();

  // Fill all required contact fields
  await formFrame.locator('#FirstName').fill(data.contact.firstName);
  await formFrame.locator('#LastName').fill(data.contact.lastName);
  await formFrame.locator('#Email').fill(data.contact.email);
  await formFrame.locator('#Company').fill(data.contact.company);
  await formFrame.locator('#Industry').selectOption(data.contact.industry);
  await formFrame.locator('#Phone').fill(data.contact.phone);
  await formFrame.locator('#Country').selectOption(data.contact.countryCode);
  await formFrame.locator('#Business_Interest__c').selectOption(data.contact.businessInterest);
  await formFrame.locator('#Web_Form_Comments__c').fill(data.contact.comments);

  // Submit and verify success
  await formFrame.locator('button:has-text("Submit")').click();
  await waitForNetworkIdle(page);

  // Verify the thank you page URL confirms successful form submission
  await verifyUrl(page, 'https://www.onespan.com/products/request-a-demo/thank-you');
}

/**
 * Navigate to demo request page via product authentication page
 */
export async function navigateToDemoRequestFromAuthentication(page: Page) {
  // Navigate to homepage
  await navigateTo(page, 'https://www.onespan.com/');
  await waitForNetworkIdle(page);

  // Click Solutions menu
  await clickButton(page, 'Solutions');
  await waitForNetworkIdle(page);

  // Navigate to Strong Customer Authentication
  await clickLink(page, 'Strong Customer Authentication');
  await waitForNetworkIdle(page);

  // Verify on authentication products page
  await verifyUrl(page, 'https://www.onespan.com/products/authentication');

  // Click Request Demo link
  await clickLink(page, 'Request demo');
  await waitForNetworkIdle(page);

  // Verify navigation to demo request page as expected user journey
  await verifyUrl(page, 'https://www.onespan.com/products/request-a-demo');
}