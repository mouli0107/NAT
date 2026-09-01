import { Page } from '@playwright/test'
import { HiltiHomePage } from '@pages/HiltiHomePage'
import { CLSCONSTRUCTIONEXOSKELETONSPage } from '@pages/CLSCONSTRUCTIONEXOSKELETONSPage'
import { CLSHEALTHSAFETYPage } from '@pages/CLSHEALTHSAFETYPage'
import { CLSPOWERTOOLS7125Page } from '@pages/CLSPOWERTOOLS7125Page'
import { CLS_POWER_TOOLS_7125Page } from '@pages/CLS_POWER_TOOLS_7125Page'
import { CLS_ROTARY_HAMMERS_7125Page } from '@pages/CLS_ROTARY_HAMMERS_7125Page'
import { EngineeringPage } from '@pages/EngineeringPage'
import { R14012433Page } from '@pages/R14012433Page'
import { WwwPage } from '@pages/WwwPage'
import {waitForNetworkIdle} from '@actions/generic/browser.actions'
import { verifyText, verifyUrl } from '@actions/generic/assert.actions'
import { TestDataRow } from '@fixtures/excel-reader'

/**
 * Accepts cookies and navigates to commercial piping solutions
 */
export async function navigateToCommercialPiping(page: Page, data: TestDataRow): Promise<void> {
  const pgHiltiHome = new HiltiHomePage(page)
  
  // Accept cookies
  await pgHiltiHome.clickAgreeButton()
  await waitForNetworkIdle(page)
  
  // Verify products button is visible
  await verifyText(page, 'Products')
  
  // Navigate to solutions > commercial piping
  await pgHiltiHome.clickSolutionsButton()
  await waitForNetworkIdle(page)
  
  await pgHiltiHome.clickCommercialPipingLink()
  await waitForNetworkIdle(page)
  
  // Close any modal/popup
  await pgHiltiHome.clickCloseButton()
  
  // Verify we're on the commercial piping page
  await verifyUrl(page, '/commercial-piping')
}

/**
 * Navigates through Engineering Center sections
 */
export async function exploreEngineeringCenter(page: Page, data: TestDataRow): Promise<void> {
  const pgHiltiHome = new HiltiHomePage(page)
  
  // Navigate to Engineering Center
  await pgHiltiHome.clickEngineeringCenterLink()
  await waitForNetworkIdle(page)
  
  // Click through the learning sections
  await pgHiltiHome.clickAskLink()
  await waitForNetworkIdle(page)
  
  await pgHiltiHome.clickLearnLink()
  await waitForNetworkIdle(page)
  
  await pgHiltiHome.clickArticlesLink()
  await waitForNetworkIdle(page)
  
  // Verify we're in the articles section
  await verifyText(page, 'ARTICLES')
}

/**
 * Accepts cookies and verifies homepage elements are loaded
 */
export async function acceptCookiesAndVerifyHomepage(page: Page, data: TestDataRow): Promise<void> {
  const pgHiltiHome = new HiltiHomePage(page)
  
  // Accept cookies
  await pgHiltiHome.clickAgreeButton()
  await waitForNetworkIdle(page)
  
  // Verify products navigation is visible
  await verifyText(page, 'Products')
  
  // Verify we're on the homepage
  await verifyUrl(page, '/')
}

// Each assertion runs as a named Playwright step — visible in HTML + Allure reports
import { test } from '@playwright/test';

export async function verifyHiltihome(page: Page, _data: TestDataRow): Promise<void> {

  await test.step("Assert \"Product \" is visible", async () => {
    await verifyText(page, 'Product ');
  });
}