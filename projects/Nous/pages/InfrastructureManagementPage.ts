import { Page } from '@playwright/test';
import { InfrastructureManagementPageLocators } from '../locators/InfrastructureManagementPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class InfrastructureManagementPage {
  private page: Page;
  private L: ReturnType<typeof InfrastructureManagementPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = InfrastructureManagementPageLocators(page);
  }
  async clickCareers() {
    await smartClick(this.L.careersLink);
  }
}