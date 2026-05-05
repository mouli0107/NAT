// Layer 4 — Business Actions
// Orchestrates Layer 2 (POMs) and Layer 3 (generic asserts) to implement domain workflows.
// RULES:
//   - Every DOM interaction goes through a POM method — never page.locator() directly
//   - Assertions use verifyText(page, 'prose string') or verifyVisible(page, '[css-selector]')
//   - No hardcoded absolute URLs — navigation uses relative paths via POM or navigateTo()
//   - The correct POM class is used for the page being interacted with (Rule 10)
import { Page } from '@playwright/test';
import { NousinfosystemsHomePage } from '@pages/NousinfosystemsHomePage';
import { DataAnalyticsDataVisualizationPage } from '@pages/DataAnalyticsDataVisualizationPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyText, verifyUrl } from '@actions/generic/assert.actions';
import { prepareSite } from '../../helpers/universal';
import { testData } from '@fixtures/test-data';

/**
 * Navigate to the Data Visualization competency page.
 * Uses DataAnalyticsDataVisualizationPage POM which has navigateToPage() for direct URL access.
 * This is more reliable than driving the mega-menu hover flow, which is prone to timing issues.
 */
export async function navigateToDataVisualization(page: Page, data = testData): Promise<void> {
  const pg = new DataAnalyticsDataVisualizationPage(page);
  await pg.navigateToPage();
  await waitForNetworkIdle(page);
}

/**
 * Explore the home page data visualization services section (tab interactions).
 * FIX 2: pg.navigateToAgileDevelopment() is the correct POM method name.
 */
export async function exploreDataVisualizationServices(page: Page, data = testData): Promise<void> {
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);

  const pg = new NousinfosystemsHomePage(page);
  // FIX 2: was pg.navigateToAgileServices() — method doesn't exist. Correct: navigateToAgileDevelopment()
  await pg.navigateToAgileDevelopment();
  await waitForNetworkIdle(page);

  await pg.clickDataVisualizationLink();
  await waitForNetworkIdle(page);

  // FIX 3: verifyUrl accepts a string path, never a RegExp
  await verifyUrl(page, '/competency/data-analytics/data-visualization');
}

/**
 * Explore capability accordion sections on the home page.
 * FIX 4 + FIX 5: verifyText() for prose strings, not verifyVisible()
 */
export async function exploreCompanyCapabilities(page: Page, data = testData): Promise<void> {
  const pg = new NousinfosystemsHomePage(page);

  await pg.clickVersatileSolutionsButton();
  await waitForNetworkIdle(page);

  await pg.clickLocalKnowledgeButton();
  await waitForNetworkIdle(page);

  await pg.clickExcellenceCenterButton();
  await waitForNetworkIdle(page);

  await pg.clickCustomAcceleratorsButton();
  await waitForNetworkIdle(page);

  // FIX 4: prose text → verifyText(), not verifyVisible()
  await verifyText(page, 'Custom accelerators, assured results');
  await verifyText(page, 'Excellence center for data visualization');
}

/**
 * Navigate to and verify all capability sections on the Data Visualization page.
 * FIX 9: Uses DataAnalyticsDataVisualizationPage POM — NOT the homepage POM.
 * FIX 10: Assertions live here (Layer 4), not inside the POM.
 */
export async function reviewDataVisualizationCapabilities(page: Page, data = testData): Promise<void> {
  // FIX 9: Instantiate the correct POM for the page being tested
  const pg = new DataAnalyticsDataVisualizationPage(page);
  await pg.navigateToPage();
  await waitForNetworkIdle(page);
  // Cookie banner reappears on every new page navigation — dismiss it again
  await prepareSite(page);

  // Accordion expansions are client-side only — no network idle wait needed between clicks
  await pg.expandDomainMasterySection();
  await pg.expandVersatileSolutionsSection();
  await pg.expandLocalKnowledgeSection();
  await pg.expandExcellenceCenterSection();

  // FIX 10: Assertions belong here in Layer 4, not inside the POM.
  await verifyText(page, 'Data visualization');
  await verifyText(page, 'Custom accelerators, assured results');
  await verifyText(page, 'Brochure');
}

/**
 * Verify key content on the NousInfoSystems home page.
 * Checks navigation items and top-level headings that are always visible
 * on the home page without expanding accordions or scrolling to hidden content.
 */
export async function verifyNousinfosystemshome(page: Page): Promise<void> {
  // Nav links are always rendered and visible on every page load
  await verifyText(page, 'Services');
  await verifyText(page, 'Competency');
  await verifyText(page, 'Insights');
}
