import { Page } from '@playwright/test';
import { NousinfosystemsPageLocators } from '@locators/NousinfosystemsPage.locators';

export class NousinfosystemsPage {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async clickIndustriesMenu(): Promise<void> {
    const loc = NousinfosystemsPageLocators.industriesNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickBankingFinancialServices(): Promise<void> {
    const loc = NousinfosystemsPageLocators.bankingFinancialServicesLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCompetencyMenu(): Promise<void> {
    const loc = NousinfosystemsPageLocators.competencyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickAIAutomation(): Promise<void> {
    const loc = NousinfosystemsPageLocators.aiAutomationLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickInsightsMenu(): Promise<void> {
    const loc = NousinfosystemsPageLocators.insightsNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCaseStudies(): Promise<void> {
    const loc = NousinfosystemsPageLocators.caseStudiesLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCompanyMenu(): Promise<void> {
    const loc = NousinfosystemsPageLocators.companyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickAboutUs(): Promise<void> {
    const loc = NousinfosystemsPageLocators.aboutUsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async isAWSLinkVisible(): Promise<boolean> {
    const loc = NousinfosystemsPageLocators.awsLink(this.page);
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getAWSLinkText(): Promise<string> {
    const loc = NousinfosystemsPageLocators.awsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }
}