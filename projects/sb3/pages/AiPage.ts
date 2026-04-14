import { Page } from '@playwright/test';
import { AiPageLocators } from '../locators/AiPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class AiPage {
  private page: Page;
  private L: ReturnType<typeof AiPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = AiPageLocators(page);
  }
  async clickLearnMore() {
    await smartClick(this.L.learnMoreLink);
  }
}