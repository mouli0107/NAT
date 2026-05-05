import { Page } from '@playwright/test';
import { Case-studyPageLocators } from '../locators/Case-studyPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Case-studyPage {
  private page: Page;
  private L: ReturnType<typeof Case-studyPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Case-studyPageLocators(page);
  }
  async clickRequestDemo() {
    await smartClick(this.L.requestDemoLink);
  }
}