import { Page } from '@playwright/test';
import { CLS_ROTARY_HAMMERS_7125PageLocators } from '../locators/CLS_ROTARY_HAMMERS_7125Page.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CLS_ROTARY_HAMMERS_7125Page {
  private page: Page;
  private L: ReturnType<typeof CLS_ROTARY_HAMMERS_7125PageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CLS_ROTARY_HAMMERS_7125PageLocators(page);
  }
  async clickIndia() {
    await smartClick(this.L.indiaButton);
  }
  async clickJapan() {
    await smartClick(this.L.japanButton);
  }
  async clickChangeCountry() {
    await smartClick(this.L.changeCountryButton);
  }
}