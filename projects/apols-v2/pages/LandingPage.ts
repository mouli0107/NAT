import { Page } from '@playwright/test';
import { LandingPageLocators } from '../locators/LandingPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class LandingPage {
  private page: Page;
  private L: ReturnType<typeof LandingPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = LandingPageLocators(page);
  }
  async clickAishuLince() {
    await smartClick(this.L.aishuLince);
  }
  async clickDavidHall() {
    await smartClick(this.L.davidHall);
  }
  async clickViewEdit() {
    await smartClick(this.L.viewEditButton);
  }
}