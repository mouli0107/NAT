import { Page } from '@playwright/test';
import { CaseStudyPageLocators } from '../locators/CaseStudyPage.locators';

export class CaseStudyPage {
  readonly page: Page;
  private readonly url: string = 'https://www.onespan.com/resources/transforming-customer-experience-through-security/case-study';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    const pageHeading = CaseStudyPageLocators.pageHeading(this.page);
    await pageHeading.waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickRequestDemo(): Promise<void> {
    const requestDemoLink = CaseStudyPageLocators.requestDemoLink(this.page);
    await requestDemoLink.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      requestDemoLink.click()
    ]);
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      const caseStudyLabel = CaseStudyPageLocators.caseStudyLabel(this.page);
      await caseStudyLabel.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getPageHeadingText(): Promise<string> {
    const pageHeading = CaseStudyPageLocators.pageHeading(this.page);
    await pageHeading.waitFor({ state: 'visible' });
    return await pageHeading.textContent() || '';
  }

  async isRaiffeisenLogoVisible(): Promise<boolean> {
    const raiffeisenLogo = CaseStudyPageLocators.raiffeisenLogo(this.page);
    try {
      await raiffeisenLogo.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isExecutiveSummaryVisible(): Promise<boolean> {
    const executiveSummaryHeading = CaseStudyPageLocators.executiveSummaryHeading(this.page);
    try {
      await executiveSummaryHeading.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickSearch(): Promise<void> {
    const searchLink = CaseStudyPageLocators.searchLink(this.page);
    await searchLink.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      searchLink.click()
    ]);
  }

  async openProductsMenu(): Promise<void> {
    const productsMenuButton = CaseStudyPageLocators.productsMenuButton(this.page);
    await productsMenuButton.waitFor({ state: 'visible' });
    await productsMenuButton.click();
  }

  async openResourcesMenu(): Promise<void> {
    const resourcesMenuButton = CaseStudyPageLocators.resourcesMenuButton(this.page);
    await resourcesMenuButton.waitFor({ state: 'visible' });
    await resourcesMenuButton.click();
  }

  async clickOnespanLogo(): Promise<void> {
    const onespanLogo = CaseStudyPageLocators.onespanLogo(this.page);
    await onespanLogo.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      onespanLogo.click()
    ]);
  }
}