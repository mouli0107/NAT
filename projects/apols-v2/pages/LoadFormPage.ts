import { Page } from '@playwright/test';
import { LoadFormPageLocators } from '../locators/LoadFormPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class LoadFormPage {
  private page: Page;
  private L: ReturnType<typeof LoadFormPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = LoadFormPageLocators(page);
  }
  async clickMyPayments() {
    await smartClick(this.L.myPaymentsLink);
  }
}