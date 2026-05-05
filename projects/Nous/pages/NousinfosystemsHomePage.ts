import { Page } from '@playwright/test';
import { NousinfosystemsHomePageLocators } from '@locators/NousinfosystemsHomePage.locators';

export class NousinfosystemsHomePage {
  constructor(private readonly page: Page) {}

  // FIX 7: Relative paths only — Playwright resolves against baseURL in playwright.config.ts
  // This makes the POM environment-agnostic (dev / staging / prod)
  async navigate(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async navigateToAgileDevelopment(): Promise<void> {
    await this.page.goto('/services/agile-development');
    await this.page.waitForLoadState('networkidle');
  }

  async clickDataVisualizationLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.dataVisualizationLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickVersatileSolutionsButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.versatileSolutionsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickLocalKnowledgeButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.localKnowledgeButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickExcellenceCenterButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.excellenceCenterButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickCustomAcceleratorsButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.customAcceleratorsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickServicesNavLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.servicesNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickIndustriesNavLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.industriesNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCompetencyNavLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.competencyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickInsightsNavLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.insightsNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCompanyNavLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.companyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickNewsLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.newsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickEventsLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.eventsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCareersLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.careersLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickContactUsLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.contactUsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async searchFor(searchText: string): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.searchInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(searchText);
  }

  async clickSearchButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.searchButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickPreviousButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.previousButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickNextButton(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.nextButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickLinkedInLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.linkedinLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickTwitterLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.twitterLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickFacebookLink(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.facebookLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async selectDigitalProductEngineeringTab(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.digitalProductEngineeringTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async selectCloudSolutionsTab(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.cloudSolutionsTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async selectDigitalServicesTab(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.digitalServicesTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async selectDataAnalyticsTab(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.dataAnalyticsTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async selectAiAutomationTab(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.aiAutomationTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async selectQeSpecialistTab(): Promise<void> {
    const loc = NousinfosystemsHomePageLocators.qeSpecialistTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }
}