import { Page } from '@playwright/test';
import { navigateTo, clickButton, clickLink, waitForNetworkIdle, clickAndWait } from '@actions/generic/browser.actions';
import { verifyText, verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Navigate to SmartBear homepage and accept cookie consent
 */
export async function acceptCookiesAndLoadHomepage(page: Page, data = testData) {
  // Navigate to SmartBear homepage
  await navigateTo(page, 'https://smartbear.com/');
  await waitForNetworkIdle(page);

  // Accept cookie consent to enable full site functionality
  await clickButton(page, 'Allow all cookies');
  await waitForNetworkIdle(page);

  // Verify homepage loaded successfully with main heading
  await verifyVisible(page, 'heading', 'Build Quality Software at AI Speed and Scale');
  
  // Verify correct URL after navigation
  await verifyUrl(page, 'https://smartbear.com/');
}

/**
 * Explore main navigation menu items to verify site structure
 */
export async function exploreNavigationMenus(page: Page, data = testData) {
  // Click AI navigation button to explore AI-related offerings
  await clickButton(page, 'AI');
  await waitForNetworkIdle(page);

  // Click Products navigation button to view product catalog
  await clickButton(page, 'Products');
  await waitForNetworkIdle(page);

  // Click Resources navigation button to access learning materials
  await clickButton(page, 'Resources');
  await waitForNetworkIdle(page);

  // Click Why SmartBear navigation button to view company value proposition
  await clickButton(page, 'Why SmartBear');
  await waitForNetworkIdle(page);

  // Verify all navigation menu items are accessible
  await verifyVisible(page, 'button', 'AI');
  await verifyVisible(page, 'button', 'Products');
  await verifyVisible(page, 'button', 'Resources');
  await verifyVisible(page, 'button', 'Why SmartBear');
}

/**
 * Navigate to Application Integrity product page
 */
export async function navigateToApplicationIntegrity(page: Page, data = testData) {
  // Click Application Integrity link to view product details
  await clickLink(page, 'Application Integrity');
  await waitForNetworkIdle(page);

  // Verify navigation to Application Integrity page completed successfully
  await verifyUrl(page, 'https://smartbear.com/application-integrity/');
  
  // Verify Application Integrity page content loaded
  await verifyVisible(page, 'main');
}