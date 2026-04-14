import { Page } from '@playwright/test';
import { PageLocators } from '../locators/Page.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Page {
  private page: Page;
  private L: ReturnType<typeof PageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = PageLocators(page);
  }
  async clickAi() {
    await smartClick(this.L.aiButton);
  }
  async clickSmartbearAiExploreOurAiTechn() {
    await smartClick(this.L.smartbearAiExploreOurAiTechnLink);
  }
}