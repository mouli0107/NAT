import { Page } from '@playwright/test';
import { LoginPageLocators } from '../locators/LoginPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class LoginPage {
  private page: Page;
  private L: ReturnType<typeof LoginPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = LoginPageLocators(page);
  }
  async clickUsername() {
    await smartClick(this.L.emailInput);
  }
  async fillUsername(value: string) {
    await smartFill(this.L.emailInput, value);
  }
  async clickPassword() {
    await smartClick(this.L.passwordInput);
  }
}