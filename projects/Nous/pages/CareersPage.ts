import { Page } from '@playwright/test';
import { CareersPageLocators } from '../locators/CareersPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CareersPage {
  private page: Page;
  private L: ReturnType<typeof CareersPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CareersPageLocators(page);
  }
  async clickContactUs() {
    await smartClick(this.L.contactUsLink);
  }
}