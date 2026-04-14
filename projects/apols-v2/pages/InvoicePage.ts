import { Page } from '@playwright/test';
import { InvoicePageLocators } from '../locators/InvoicePage.locators';
import { smartClick } from '../helpers/universal';

export class InvoicePage {
  private page: Page;
  private L: ReturnType<typeof InvoicePageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = InvoicePageLocators(page);
  }

  async clickMyPayments() {
    await smartClick(this.L.myPaymentsTab);
    await this.page.waitForTimeout(3000);
  }

  async selectInvoice() {
    const hasCheckbox = await this.L.invoiceCheckbox.isVisible().catch(() => false);
    if (hasCheckbox) {
      await this.L.invoiceCheckbox.check({ force: true });
      await this.page.waitForTimeout(500);
    } else {
      console.log('[InvoicePage] No invoice checkbox found — invoice grid may be empty');
    }
  }

  async clickPayNow() {
    const visible = await this.L.payNowButton.isVisible().catch(() => false);
    if (visible) {
      await smartClick(this.L.payNowButton);
      await this.page.waitForTimeout(2000);
      // Dismiss "Please select at least one invoice" warning if it appears
      const warningBtn = this.L.warningDoneButton;
      const warningVisible = await warningBtn.isVisible().catch(() => false);
      if (warningVisible) {
        console.log('[InvoicePage] Warning: "Please select at least one invoice" — no pending invoices');
        await smartClick(warningBtn);
        await this.page.waitForTimeout(500);
        throw new Error('No pending invoices available. All invoices may already be paid.');
      }
      await this.page.waitForTimeout(1000);
    } else {
      console.log('[InvoicePage] Pay Now button not visible');
    }
  }

  async clickShowClosedInvoice() {
    const btn = this.L.showClosedInvoiceButton;
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await smartClick(btn);
      await this.page.waitForTimeout(2000);
      console.log('[InvoicePage] Toggled Show Closed Invoice');
    }
  }
}
