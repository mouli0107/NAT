import { Page } from '@playwright/test';
import { BlogPageLocators } from '../locators/BlogPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class BlogPage {
  private page: Page;
  private L: ReturnType<typeof BlogPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = BlogPageLocators(page);
  }
  async clickCybersecurityPricingContactA() {
    await smartClick(this.L.cybersecurityPricingContactALink);
  }
}