import { Page } from '@playwright/test';
import { HiltiHomePageLocators } from '@locators/HiltiHomePage.locators';

export class HiltiHomePage {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async acceptCookies(): Promise<void> {
    const loc = HiltiHomePageLocators.agreeCookiesButton(this.page);
    await loc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await loc.isVisible()) {
      await loc.click();
    }
  }

  async clickProductsNav(): Promise<void> {
    const loc = HiltiHomePageLocators.productsNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickPowerTools(): Promise<void> {
    const loc = HiltiHomePageLocators.powerToolsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickChangeCountry(): Promise<void> {
    const loc = HiltiHomePageLocators.changeCountryButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickEngineeringCentre(): Promise<void> {
    const loc = HiltiHomePageLocators.engineeringCentreLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickBusinessOptimization(): Promise<void> {
    const loc = HiltiHomePageLocators.businessOptimizationButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickControlCosts(): Promise<void> {
    const loc = HiltiHomePageLocators.controlCostsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickHealthAndSafety(): Promise<void> {
    const loc = HiltiHomePageLocators.healthAndSafetyLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickConstructionExoskeletons(): Promise<void> {
    const loc = HiltiHomePageLocators.constructionExoskeletonsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickExoSShoulder(): Promise<void> {
    const loc = HiltiHomePageLocators.exoSShoulderLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickAddToCart(): Promise<void> {
    const loc = HiltiHomePageLocators.addToCartButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async searchFor(searchText: string): Promise<void> {
    const searchInput = HiltiHomePageLocators.searchInput(this.page);
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(searchText);
    
    const searchButton = HiltiHomePageLocators.searchButton(this.page);
    await searchButton.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      searchButton.click()
    ]);
  }

  async goToCart(): Promise<void> {
    const loc = HiltiHomePageLocators.cartLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickHiltiLogo(): Promise<void> {
    const loc = HiltiHomePageLocators.hiltiLogo(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickSolutionsNav(): Promise<void> {
    const loc = HiltiHomePageLocators.solutionsNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickSupportNav(): Promise<void> {
    const loc = HiltiHomePageLocators.supportNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickCompanyNav(): Promise<void> {
    const loc = HiltiHomePageLocators.companyNavLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async getMainHeadingText(): Promise<string> {
    const loc = HiltiHomePageLocators.mainHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  async clickCurrentPromotions(): Promise<void> {
    const loc = HiltiHomePageLocators.currentPromotionsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickQuickItemEntry(): Promise<void> {
    const loc = HiltiHomePageLocators.quickItemEntryButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    const logo = HiltiHomePageLocators.hiltiLogo(this.page);
    await logo.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async isSearchVisible(): Promise<boolean> {
    const loc = HiltiHomePageLocators.searchInput(this.page);
    return await loc.isVisible();
  }

  async isCartLinkVisible(): Promise<boolean> {
    const loc = HiltiHomePageLocators.cartLink(this.page);
    return await loc.isVisible();
  }
}