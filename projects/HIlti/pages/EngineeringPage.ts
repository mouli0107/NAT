import { Page } from '@playwright/test';
import { EngineeringPageLocators } from '../locators/EngineeringPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class EngineeringPage {
  private page: Page;
  private L: ReturnType<typeof EngineeringPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = EngineeringPageLocators(page);
  }
  async clickBusinessOptimization() {
    await smartClick(this.L.businessOptimizationButton);
  }
  async clickControlCosts() {
    await smartClick(this.L.controlCostsLink);
  }
}