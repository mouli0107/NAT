import { Page } from '@playwright/test';
import { AdminLoginPageLocators } from '../locators/AdminLoginPage.locators';
import { smartFill, smartClick } from '../helpers/universal';

export class AdminLoginPage {
  private page: Page;
  private L: ReturnType<typeof AdminLoginPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = AdminLoginPageLocators(page);
  }

  async login(email: string, password: string) {
    await smartFill(this.L.emailInput, email);
    await smartFill(this.L.passwordInput, password);
    await smartClick(this.L.loginButton);
    await this.page.waitForURL('**/FormsManager/CreateEditForms', { waitUntil: 'domcontentloaded' });
  }
}
