import { Page } from '@playwright/test';
import { R14012433PageLocators } from '../locators/R14012433Page.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class R14012433Page {
  private page: Page;
  private L: ReturnType<typeof R14012433PageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = R14012433PageLocators(page);
  }
  async clickAddToCart() {
    await smartClick(this.L.addToCartButton);
  }
}