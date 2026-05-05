import { Page } from '@playwright/test';
import { Contact-usPageLocators } from '../locators/Contact-usPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Contact-usPage {
  private page: Page;
  private L: ReturnType<typeof Contact-usPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Contact-usPageLocators(page);
  }
  async clickRequestDemo() {
    await smartClick(this.L.requestDemoLink);
  }
}