import { Page } from '@playwright/test';
import { LandingPageLocators } from '../locators/LandingPage.locators';

export class LandingPage {
  readonly page: Page;
  private readonly url = 'https://apolf-web-preprod.azurewebsites.net/Applicant/Landing';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the Landing page
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /**
   * Click on Arjun Tendulkar applicant
   */
  async clickArjunTendulkar(): Promise<void> {
    const locator = LandingPageLocators.arjunTendulkarLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the View/Edit button
   */
  async clickViewEdit(): Promise<void> {
    const locator = LandingPageLocators.viewEditButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Check if error image is visible on the page
   */
  async isErrorImageVisible(): Promise<boolean> {
    const locator = LandingPageLocators.errorImage(this.page);
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the Landing page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
}