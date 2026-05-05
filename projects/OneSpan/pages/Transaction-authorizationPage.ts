import { Page } from '@playwright/test';
import { Transaction-authorizationPageLocators } from '../locators/Transaction-authorizationPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Transaction-authorizationPage {
  private page: Page;
  private L: ReturnType<typeof Transaction-authorizationPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Transaction-authorizationPageLocators(page);
  }
  async clickResources() {
    await smartClick(this.L.resourcesButton);
  }
  async clickBlog() {
    await smartClick(this.L.blogLink);
  }
}