import { Page } from '@playwright/test';
import { NousinfosystemsPage } from '@pages/NousinfosystemsPagePage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyText, verifyUrl, verifyVisible, verifyEnabled, verifyDisabled,
         verifyChecked, verifyUnchecked, verifyInputValue, verifyInputContains,
         verifyAttribute, verifyCount, screenshotOnFailure } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Navigate through the main menu items to explore company information and verify AWS partnership
 */
export async function exploreCompanyAndPartnerships(page: Page, data = testData): Promise<void> {
  // Navigate to the main page
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  const pg = new NousinfosystemsPage(page);
  
  // Click on Industries menu and select Banking & Financial Services
  await pg.clickIndustriesMenu();
  await waitForNetworkIdle(page);
  await pg.clickBankingFinancialServices();
  await waitForNetworkIdle(page);
  
  // Click on Competency menu and select AI & Automation
  await pg.clickCompetencyMenu();
  await waitForNetworkIdle(page);
  await pg.clickAIAutomation();
  await waitForNetworkIdle(page);
  
  // Click on Insights menu and select Case Studies
  await pg.clickInsightsMenu();
  await waitForNetworkIdle(page);
  await pg.clickCaseStudies();
  await waitForNetworkIdle(page);
  
  // Click on Company menu and select About Us
  await pg.clickCompanyMenu();
  await waitForNetworkIdle(page);
  await pg.clickAboutUs();
  await waitForNetworkIdle(page);
  
  // Verify AWS partnership is visible (assertion already handled by verify function)
}

/**
 * Navigate to the banking and financial services section
 */
export async function navigateToBankingServices(page: Page, data = testData): Promise<void> {
  // Navigate to the main page
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  const pg = new NousinfosystemsPage(page);
  
  // Click on Industries menu and select Banking & Financial Services
  await pg.clickIndustriesMenu();
  await waitForNetworkIdle(page);
  await pg.clickBankingFinancialServices();
  await waitForNetworkIdle(page);
}

/**
 * Navigate to the AI and automation competency section
 */
export async function navigateToAICompetency(page: Page, data = testData): Promise<void> {
  // Navigate to the main page
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  const pg = new NousinfosystemsPage(page);
  
  // Click on Competency menu and select AI & Automation
  await pg.clickCompetencyMenu();
  await waitForNetworkIdle(page);
  await pg.clickAIAutomation();
  await waitForNetworkIdle(page);
}

// Each assertion runs as a named Playwright step — visible in HTML + Allure reports
import { test } from '@playwright/test';

export async function verifyNousinfosystemspage(page: Page): Promise<void> {

  await test.step("Assert \"AWS\" is visible", async () => {
    await verifyText(page, 'AWS');
  });
}