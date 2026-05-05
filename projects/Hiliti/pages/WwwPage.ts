import { Page } from '@playwright/test';
import { WwwPageLocators } from '../locators/WwwPage.locators';

export class WwwPage {
  constructor(private page: Page) {}

  async navigate(url: string = 'https://www.hilti.com/'): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async clickSolutions(): Promise<void> {
    const locator = WwwPageLocators.solutionsButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickProducts(): Promise<void> {
    const locator = WwwPageLocators.productsButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async acceptCookieConsent(): Promise<void> {
    const locator = WwwPageLocators.agreeButton(this.page);
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.click();
  }

  async clickAgreeButton(): Promise<void> {
    await this.acceptCookieConsent();
  }

  async clickPowerTools(): Promise<void> {
    const locator = WwwPageLocators.powerToolsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickExploreProfisEngineering(): Promise<void> {
    const locator = WwwPageLocators.exploreProfisEngineeringLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async search(searchTerm: string): Promise<void> {
    const searchInput = WwwPageLocators.searchCombobox(this.page);
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(searchTerm);
    
    const searchButton = WwwPageLocators.searchButton(this.page);
    await searchButton.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      searchButton.click()
    ]);
  }

  async clickCart(): Promise<void> {
    const locator = WwwPageLocators.cartLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickLoginRegister(): Promise<void> {
    const locator = WwwPageLocators.loginRegisterLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickEngineeringCenter(): Promise<void> {
    const locator = WwwPageLocators.engineeringCenterLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickSupportAndDownloads(): Promise<void> {
    const locator = WwwPageLocators.supportAndDownloadsButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickCompany(): Promise<void> {
    const locator = WwwPageLocators.companyButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickContact(): Promise<void> {
    const locator = WwwPageLocators.contactButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickOrders(): Promise<void> {
    const locator = WwwPageLocators.ordersLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickLearnMoreProfis(): Promise<void> {
    const locator = WwwPageLocators.learnMoreProfisLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      await WwwPageLocators.homeLogo(this.page).waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}