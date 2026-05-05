import { Page } from '@playwright/test';
import { CLS_POWER_TOOLS_7125PageLocators } from '../locators/CLS_POWER_TOOLS_7125Page.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CLS_POWER_TOOLS_7125Page {
  private page: Page;
  private L: ReturnType<typeof CLS_POWER_TOOLS_7125PageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CLS_POWER_TOOLS_7125PageLocators(page);
  }
  async clickRotaryHammers() {
    await smartClick(this.L.rotaryHammersLink);
  }
}