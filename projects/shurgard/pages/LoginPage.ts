import { Page } from '@playwright/test';
import { LoginPageLocators } from '../locators/LoginPage.locators';
import { smartFill, smartClick } from '../helpers/universal';

export class LoginPage {
  private page: Page;
  private L: ReturnType<typeof LoginPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = LoginPageLocators(page);
  }

  async fillUsername(value: string) {
    await smartFill(this.L.emailInput, value);
  }

  async fillPassword(value: string) {
    await smartFill(this.L.passwordInput, value);
  }

  async clickLogin() {
    await smartClick(this.L.loginButton);
  }

  /** Returns the error/alert locator (visible after failed login) */
  getErrorMessage() {
    return this.L.errorMessage;
  }

  /** Wait for the error message to appear and return its text */
  async waitForErrorMessage(timeout = 20000): Promise<string> {
    await this.L.errorMessage.waitFor({ state: 'visible', timeout });
    return (await this.L.errorMessage.textContent() ?? '').trim();
  }
}
