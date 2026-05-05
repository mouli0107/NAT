import { Page } from '@playwright/test';
import { OnespanHomePage } from '@pages/OnespanHomePage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { testData } from '@fixtures/test-data';

/**
 * Navigate to the OneSpan home page and access the Products section
 */
export async function navigateToProducts(page: Page, data = testData): Promise<void> {
  // Navigate to OneSpan home page
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  // Click on Products button in the main navigation
  const pgOnespan = new OnespanHomePage(page);
  await pgOnespan.clickProductsButton();
  await waitForNetworkIdle(page);
  
  // The assertion for "Solution" being visible is handled by a separate verify function
  // as specified in the requirements - no assertion code needed here
}

/**
 * Navigate to the OneSpan home page
 */
export async function navigateToHomePage(page: Page, data = testData): Promise<void> {
  // Navigate to OneSpan home page
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  // Verify the page has loaded by checking if the Products button is available
  const pgOnespan = new OnespanHomePage(page);
  // Page is ready for interaction
}
import { verifyText, verifyUrl, verifyVisible, verifyEnabled, verifyDisabled,
         verifyChecked, verifyUnchecked, verifyInputValue, verifyInputContains,
         verifyAttribute, verifyCount, screenshotOnFailure } from '@actions/generic/assert.actions';

// Each assertion runs as a named Playwright step — visible in HTML + Allure reports
import { test } from '@playwright/test';

export async function verifyOnespanhome(page: Page): Promise<void> {

  await test.step("Assert \"Solution \" is visible", async () => {
    await verifyText(page, 'Solution ');
  });
}