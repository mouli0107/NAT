import { Page } from '@playwright/test';
import { HiltiHomePage } from '@pages/HiltiHomePage';
import { CLSCONSTRUCTIONEXOSKELETONSPage } from '@pages/CLSCONSTRUCTIONEXOSKELETONSPage';
import { CLSHEALTHSAFETYPage } from '@pages/CLSHEALTHSAFETYPage';
import { CLSPOWERTOOLS7125Page } from '@pages/CLSPOWERTOOLS7125Page';
import { CLS_POWER_TOOLS_7125Page } from '@pages/CLS_POWER_TOOLS_7125Page';
import { CLS_ROTARY_HAMMERS_7125Page } from '@pages/CLS_ROTARY_HAMMERS_7125Page';
import { EngineeringPage } from '@pages/EngineeringPage';
import { R14012433Page } from '@pages/R14012433Page';
import { WwwPage } from '@pages/WwwPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { getTestData, TestDataRow } from '@fixtures/excel-reader';

/**
 * Navigate to the home page and accept cookies
 */
export async function navigateToHomeAndAcceptCookies(page: Page, data: TestDataRow): Promise<void> {
  // Navigate to the base URL
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  // Accept cookies
  const pgWww = new WwwPage(page);
  await pgWww.clickAgreeAgreeToOurDataProcessin();
  await waitForNetworkIdle(page);
  
  // Verify we're on the home page
  await verifyUrl(page, '/');
}

/**
 * Browse to power tools section and change country
 */
export async function browseToPowerToolsAndChangeCountry(page: Page, data: TestDataRow): Promise<void> {
  // Click Products navigation
  const pgWww = new WwwPage(page);
  await pgWww.clickProducts();
  await waitForNetworkIdle(page);
  
  // Click Power tools link
  await pgWww.clickPowerTools();
  await waitForNetworkIdle(page);
  
  // Change country
  const pgCLSPOWERTOOLS7125 = new CLSPOWERTOOLS7125Page(page);
  await pgCLSPOWERTOOLS7125.clickChangeCountry();
  await waitForNetworkIdle(page);
  
  // Verify navigation occurred
  await verifyVisible(page, '[data-testid="country-selector"]');
}

/**
 * Navigate through engineering center to control costs section
 */
export async function navigateToControlCostsViaEngineering(page: Page, data: TestDataRow): Promise<void> {
  // Click Engineering Centre
  const pgHiltiHome = new HiltiHomePage(page);
  await pgHiltiHome.clickEngineeringCentre();
  await waitForNetworkIdle(page);
  
  // Click Business Optimization
  const pgEngineering = new EngineeringPage(page);
  await pgEngineering.clickBusinessOptimization();
  await waitForNetworkIdle(page);
  
  // Click Control Costs
  await pgEngineering.clickControlCosts();
  await waitForNetworkIdle(page);
  
  // Verify we reached the control costs section
  await verifyUrl(page, '/engineering');
}

/**
 * Navigate to exoskeleton product and add to cart
 */
export async function addExoskeletonToCart(page: Page, data: TestDataRow): Promise<void> {
  // Click Products navigation
  const pgHiltiHome = new HiltiHomePage(page);
  await pgHiltiHome.clickProductsNav();
  await waitForNetworkIdle(page);
  
  // Navigate to Health and Safety
  await pgHiltiHome.clickHealthAndSafety();
  await waitForNetworkIdle(page);
  
  // Click Construction exoskeletons
  const pgCLSHEALTHSAFETY = new CLSHEALTHSAFETYPage(page);
  await pgCLSHEALTHSAFETY.clickConstructionExoskeletons();
  await waitForNetworkIdle(page);
  
  // Click EXO-S Shoulder Exoskeleton
  const pgCLSCONSTRUCTIONEXOSKELETONS = new CLSCONSTRUCTIONEXOSKELETONSPage(page);
  await pgCLSCONSTRUCTIONEXOSKELETONS.clickExoSShoulderExoskeleton();
  await waitForNetworkIdle(page);
  
  // Add to cart
  const pgR14012433 = new R14012433Page(page);
  await pgR14012433.clickAddToCart();
  await waitForNetworkIdle(page);
  
  // Verify item was added to cart
  await verifyVisible(page, '[data-testid="cart-confirmation"]');
}