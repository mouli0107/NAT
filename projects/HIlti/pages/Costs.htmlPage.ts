import { Page } from '@playwright/test';
import { Costs.htmlPageLocators } from '../locators/Costs.htmlPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Costs.htmlPage {
  private page: Page;
  private L: ReturnType<typeof Costs.htmlPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Costs.htmlPageLocators(page);
  }
  async clickProducts() {
    await smartClick(this.L.productsButton);
  }
  async clickHealthAndSafety() {
    await smartClick(this.L.healthAndSafetyLink);
  }
}