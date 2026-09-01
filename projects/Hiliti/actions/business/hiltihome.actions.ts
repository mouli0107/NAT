import { Page } from '@playwright/test';
import { HiltiHomePage } from '@pages/HiltiHomePage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { getTestData, TestDataRow } from '@fixtures/excel-reader';

/**
 * Navigates to Hilti home page and accepts cookie consent
 */
export async function navigateAndAcceptCookies(page: Page, data: TestDataRow): Promise<void> {
  // Navigate to the Hilti home page
  await navigateTo(page, data.baseUrl);
  
  // Initialize the home page object
  const pgHiltiHome = new HiltiHomePage(page);
  
  // Click the cookie consent agree button
  await pgHiltiHome.clickAgreeButton();
  await waitForNetworkIdle(page);
}

/**
 * Performs initial site setup including navigation and cookie acceptance
 */
export async function setupHiltiSite(page: Page, data: TestDataRow): Promise<void> {
  // Navigate to base URL
  await navigateTo(page, data.baseUrl);
  
  // Initialize the home page
  const pgHiltiHome = new HiltiHomePage(page);
  
  // Accept cookies to proceed with site interaction
  await pgHiltiHome.clickAgreeButton();
  await waitForNetworkIdle(page);
  
  // Wait for page to be ready after cookie acceptance
  await pgHiltiHome.waitForPageReady();
}
import { verifyText, verifyUrl, verifyVisible, verifyEnabled, verifyDisabled,
         verifyChecked, verifyUnchecked, verifyInputValue, verifyInputContains,
         verifyAttribute, verifyCount, screenshotOnFailure } from '@actions/generic/assert.actions';

// Each assertion runs as a named Playwright step — visible in HTML + Allure reports
import { test } from '@playwright/test';

export async function verifyHiltihome(page: Page): Promise<void> {

  await test.step("Assert \"Product \" is enabled", async () => {
    await verifyEnabled(page, 'Product ');
  });
}