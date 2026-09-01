import { Page } from '@playwright/test';
import { HiltiHomePageLocators } from '@locators/HiltiHomePage.locators';

export class HiltiHomePage {
  constructor(private readonly page: Page) {}

  async navigateToHomePage(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  }

  async clickAgreeButton(): Promise<void> {
    const loc = HiltiHomePageLocators.agreeButton(this.page);
    await loc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickSkipToMainContent(): Promise<void> {
    const loc = HiltiHomePageLocators.skipToMainContentLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickCart(): Promise<void> {
    const loc = HiltiHomePageLocators.cartLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async searchFor(searchTerm: string): Promise<void> {
    const loc = HiltiHomePageLocators.searchInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(searchTerm);
  }

  async clickSearchButton(): Promise<void> {
    const loc = HiltiHomePageLocators.searchButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickProductsMenu(): Promise<void> {
    const loc = HiltiHomePageLocators.productsMenuButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickSolutionsMenu(): Promise<void> {
    const loc = HiltiHomePageLocators.solutionsMenuButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickSupportMenu(): Promise<void> {
    const loc = HiltiHomePageLocators.supportMenuButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickCompanyMenu(): Promise<void> {
    const loc = HiltiHomePageLocators.companyMenuButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async getMainHeadingText(): Promise<string> {
    const loc = HiltiHomePageLocators.mainHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  async clickShopNow(): Promise<void> {
    const loc = HiltiHomePageLocators.shopNowLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async pauseAutoplay(): Promise<void> {
    const loc = HiltiHomePageLocators.pauseAutoplayButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickQuickItemEntry(): Promise<void> {
    const loc = HiltiHomePageLocators.quickItemEntryButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickLogin(): Promise<void> {
    const loc = HiltiHomePageLocators.loginLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickOrders(): Promise<void> {
    const loc = HiltiHomePageLocators.ordersLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickContact(): Promise<void> {
    const loc = HiltiHomePageLocators.contactButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickEngineeringCenter(): Promise<void> {
    const loc = HiltiHomePageLocators.engineeringCenterLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickHome(): Promise<void> {
    const loc = HiltiHomePageLocators.homeLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickToggleMenu(): Promise<void> {
    const loc = HiltiHomePageLocators.toggleMenuButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    const loc = HiltiHomePageLocators.homeLink(this.page);
    await loc.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async isSearchVisible(): Promise<boolean> {
    const loc = HiltiHomePageLocators.searchInput(this.page);
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isLoginLinkVisible(): Promise<boolean> {
    const loc = HiltiHomePageLocators.loginLink(this.page);
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}