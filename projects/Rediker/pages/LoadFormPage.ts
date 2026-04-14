import { Page } from '@playwright/test';
import { LoadFormPageLocators } from '../locators/LoadFormPage.locators';

export class LoadFormPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToPage(): Promise<void> {
    await this.page.goto('https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickSachinTendulkar(): Promise<void> {
    const locator = LoadFormPageLocators.sachinTendulkarOption(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickLogOut(): Promise<void> {
    const locator = LoadFormPageLocators.logOutLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async isErrorImageVisible(): Promise<boolean> {
    const locator = LoadFormPageLocators.errorImage(this.page);
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}