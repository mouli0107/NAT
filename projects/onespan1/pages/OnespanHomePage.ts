import { Page } from '@playwright/test';
import { OnespanHomePageLocators } from '@locators/OnespanHomePage.locators';

export class OnespanHomePage {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('https://www.onespan.com/');
    await this.page.waitForLoadState('networkidle');
  }

  async clickFidoHardwareAuthenticatorsLink(): Promise<void> {
    const loc = OnespanHomePageLocators.fidoHardwareAuthenticatorsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }
}