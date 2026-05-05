// FIX 10: No expect() in POM layer — POMs interact with DOM only (locate, click, fill, read).
// Assertions belong exclusively in Layer 4 (business actions) or Layer 5 (tests).
// All former assert*() methods are now get*() methods that return text for the caller to assert.
import { Page } from '@playwright/test';
import { DataAnalyticsDataVisualizationPageLocators } from '@locators/DataAnalyticsDataVisualizationPage.locators';

export class DataAnalyticsDataVisualizationPage {
  constructor(private readonly page: Page) {}

  // FIX 7: Relative path — Playwright resolves against baseURL in playwright.config.ts
  // domcontentloaded is faster than 'load' and sufficient for SPA/WordPress sites.
  // networkidle has a capped timeout so polling/ads never block the test.
  async navigateToPage(): Promise<void> {
    await this.page.goto('/competency/data-analytics/data-visualization', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  // ── Text getters — return raw text; caller (Layer 4) asserts ────────────────
  // FIX 10: was assertCustomAcceleratorsText() with expect() inside
  async getCustomAcceleratorsText(): Promise<string> {
    const loc = DataAnalyticsDataVisualizationPageLocators.customAcceleratorsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  // FIX 10: was assertBrochureText() with expect() inside
  async getBrochureText(): Promise<string> {
    const loc = DataAnalyticsDataVisualizationPageLocators.brochureText(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  // FIX 10: was assertDataVisualizationLeadText() with expect() inside
  async getLeadHeadingText(): Promise<string> {
    const loc = DataAnalyticsDataVisualizationPageLocators.dataVisualizationLeadHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  // FIX 10: was assertCompetencyNavigationText() with expect() inside
  async getCompetencyNavText(): Promise<string> {
    const loc = DataAnalyticsDataVisualizationPageLocators.competencyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  // FIX 10: was verifyDataVisualizationHeading() with expect() inside
  async getDataVisualizationHeadingText(): Promise<string> {
    const loc = DataAnalyticsDataVisualizationPageLocators.dataVisualizationHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  // ── Expand capability sections (accordion/tab interactions) ─────────────────
  async expandDomainMasterySection(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.domainMasteryButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async expandVersatileSolutionsSection(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.versatileSolutionsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async expandLocalKnowledgeSection(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.localKnowledgeButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async expandExcellenceCenterSection(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.excellenceCenterButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  async clickCustomAcceleratorsButton(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.customAcceleratorsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async searchFor(searchTerm: string): Promise<void> {
    const searchBoxLoc = DataAnalyticsDataVisualizationPageLocators.searchBox(this.page);
    await searchBoxLoc.waitFor({ state: 'visible' });
    await searchBoxLoc.fill(searchTerm);

    const searchButtonLoc = DataAnalyticsDataVisualizationPageLocators.searchButton(this.page);
    await searchButtonLoc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      searchButtonLoc.click()
    ]);
  }

  async navigateToNews(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.newsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToEvents(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.eventsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToCareers(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.careersLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToContactUs(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.contactUsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToServices(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.servicesLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToIndustries(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.industriesLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToCompetency(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.competencyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToInsights(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.insightsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToCompany(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.companyLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickPreviousCarouselButton(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.previousButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickNextCarouselButton(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.nextButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async navigateToPowerBIServices(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.powerBILearnMoreLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToQlikServices(): Promise<void> {
    const loc = DataAnalyticsDataVisualizationPageLocators.qlikLearnMoreLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  // ── Visibility checks — return boolean; caller asserts ───────────────────────
  // FIX 10: was verifyPowerBISection() with expect() inside
  async isPowerBISectionVisible(): Promise<boolean> {
    const loc = DataAnalyticsDataVisualizationPageLocators.powerBIServicesHeading(this.page);
    return loc.isVisible();
  }

  // FIX 10: was verifyQlikSection() with expect() inside
  async isQlikSectionVisible(): Promise<boolean> {
    const loc = DataAnalyticsDataVisualizationPageLocators.qlikHeading(this.page);
    return loc.isVisible();
  }
}
