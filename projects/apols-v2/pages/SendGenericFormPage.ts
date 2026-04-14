import { Page } from '@playwright/test';
import { SendGenericFormPageLocators } from '../locators/SendGenericFormPage.locators';
import { smartFill, smartClick } from '../helpers/universal';

export class SendGenericFormPage {
  private page: Page;
  private L: ReturnType<typeof SendGenericFormPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = SendGenericFormPageLocators(page);
  }

  async selectRecipient(email: string) {
    // Try to find a row matching the email; fall back to first checkbox
    const row = this.page.locator('tr').filter({ hasText: email });
    const rowCount = await row.count();
    if (rowCount > 0) {
      const checkbox = row.first().locator('input[type="checkbox"]').first();
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      await checkbox.check({ force: true });
    } else {
      console.log(`[SendGenericFormPage] Email "${email}" not in grid, selecting first recipient`);
      await this.L.recipientCheckboxFirst.check({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  async clickSendEmail() {
    await smartClick(this.L.sendEmailButton);
    await this.page.waitForTimeout(3000);
  }

  async waitForComposeWindow() {
    await this.L.composeWindow.waitFor({ state: 'visible', timeout: 10000 });
  }

  async setToField(email: string) {
    await this.L.toField.fill('');
    await this.L.toField.fill(email);
  }

  async clickSendInCompose() {
    // Use force:true to bypass Kendo editor iframe intercept
    await this.L.btnSend.click({ force: true });
    await this.page.waitForTimeout(3000);
  }

  async dismissPopup() {
    const popup = this.L.composeWindow;
    const appeared = await popup.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (appeared) {
      await smartClick(popup.locator('button:has-text("OK"), button:has-text("DONE"), button:has-text("EXIT")').first());
      await this.page.waitForTimeout(1000);
    }
  }
}
