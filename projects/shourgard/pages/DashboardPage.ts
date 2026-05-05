import { Page } from '@playwright/test';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class DashboardPage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }
  async fillPassword(value: string) {
    await smartFill(this.L.passwordInput, value);
  }
}