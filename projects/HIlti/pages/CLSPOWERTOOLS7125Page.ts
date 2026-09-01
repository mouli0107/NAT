import { Page } from '@playwright/test';
import { CLSPOWERTOOLS7125PageLocators } from '../locators/CLSPOWERTOOLS7125Page.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CLSPOWERTOOLS7125Page {
  private page: Page;
  private L: ReturnType<typeof CLSPOWERTOOLS7125PageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CLSPOWERTOOLS7125PageLocators(page);
  }
  async clickChangeCountry() {
    await smartClick(this.L.changeCountryButton);
  }
}