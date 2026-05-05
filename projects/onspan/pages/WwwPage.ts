import { Page } from '@playwright/test';
import { WwwPageLocators } from '../locators/WwwPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class WwwPage {
  private page: Page;
  private L: ReturnType<typeof WwwPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = WwwPageLocators(page);
  }
  async clickResources() {
    await smartClick(this.L.resourcesButton);
  }
  async clickSolutions() {
    await smartClick(this.L.solutionsButton);
  }
  async clickCompany() {
    await smartClick(this.L.companyButton);
  }
  async clickContactUs() {
    await smartClick(this.L.contactUsLink);
  }
}