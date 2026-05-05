import { Page } from '@playwright/test';
import { En-inPageLocators } from '../locators/En-inPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class En-inPage {
  private page: Page;
  private L: ReturnType<typeof En-inPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = En-inPageLocators(page);
  }
  async clickAllMicrosoft() {
    await smartClick(this.L.allMicrosoftButton);
  }
  async clickWindowsApps() {
    await smartClick(this.L.windowsAppsLink);
  }
}