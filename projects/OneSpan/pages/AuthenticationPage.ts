import { Page } from '@playwright/test';
import { AuthenticationPageLocators } from '../locators/AuthenticationPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class AuthenticationPage {
  private page: Page;
  private L: ReturnType<typeof AuthenticationPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = AuthenticationPageLocators(page);
  }
  async clickGetStartedAboutAuthenticatio() {
    await smartClick(this.L.getStartedLink);
  }
}