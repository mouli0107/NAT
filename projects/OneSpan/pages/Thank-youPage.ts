import { Page } from '@playwright/test';
import { Thank-youPageLocators } from '../locators/Thank-youPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Thank-youPage {
  private page: Page;
  private L: ReturnType<typeof Thank-youPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Thank-youPageLocators(page);
  }
  async clickThankYou() {
    await smartClick(this.L.thankYou);
  }
  async clickThankYouForRequestingADemoFr() {
    await smartClick(this.L.thankYouForRequestingADemoFr);
  }
}