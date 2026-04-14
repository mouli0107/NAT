import { Page } from '@playwright/test';
import { AdminLoginPageLocators } from '../locators/AdminLoginPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class AdminLoginPage {
  private page: Page;
  private L: ReturnType<typeof AdminLoginPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = AdminLoginPageLocators(page);
  }
  async clickTxtusername() {
    await smartClick(this.L.emailInput);
  }
  async clickLogin() {
    await smartClick(this.L.loginButton);
  }
}