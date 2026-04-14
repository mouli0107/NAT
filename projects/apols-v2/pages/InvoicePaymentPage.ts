import { Page } from '@playwright/test';
import { InvoicePaymentPageLocators } from '../locators/InvoicePaymentPage.locators';
import { smartClick, smartFill } from '../helpers/universal';
import { waitAndDismissAnyKendoAlert } from '../helpers/kendo';

export interface CardDetails {
  cardholderName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
}

export interface ACHDetails {
  accountName?: string;
  accountType?: string;   // 'Personal Checking', 'Personal Savings', 'Business Checking', 'Business Savings'
  accountNumber?: string;
  routingNumber?: string;
}

export type PaymentMethod = 'card' | 'ach';

export class InvoicePaymentPage {
  private page: Page;
  private L: ReturnType<typeof InvoicePaymentPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = InvoicePaymentPageLocators(page);
  }

  async clickNewPaymentMethod() {
    const visible = await this.L.newPaymentMethodLink.isVisible().catch(() => false);
    if (visible) {
      await this.L.newPaymentMethodLink.click({ force: true });
    } else {
      await this.page.evaluate(() => {
        const els = document.querySelectorAll('a, span, div, button');
        for (const el of els) {
          if (el.textContent?.trim().includes('New Payment Method')) {
            (el as HTMLElement).click();
            return;
          }
        }
      });
    }
  }

  async waitForFinixIframes(minCount = 3, timeoutSeconds = 10): Promise<number> {
    for (let i = 0; i < timeoutSeconds; i++) {
      await this.page.waitForTimeout(1000);
      const count = await this.L.finixIframes.count();
      if (count >= minCount) {
        console.log(`[InvoicePaymentPage] Finix iframes loaded: ${count}`);
        return count;
      }
    }
    return await this.L.finixIframes.count();
  }

  /**
   * Decode the Finix iframe URL base64 token to identify field type.
   * Returns a map of { "name": 0, "number": 1, "expiration_date": 2, ... }
   */
  async getFinixFieldMap(): Promise<Record<string, number>> {
    const finixCount = await this.L.finixIframes.count();
    const fieldMap: Record<string, number> = {};

    for (let i = 0; i < finixCount; i++) {
      const iframe = this.L.finixIframes.nth(i);
      const box = await iframe.boundingBox().catch(() => null);
      if (!box || box.width <= 0 || box.height <= 0) continue;

      const fieldType = await this.page.evaluate((idx: number) => {
        const el = document.querySelectorAll('iframe[src*="finix.com"]')[idx] as HTMLIFrameElement;
        if (!el) return '';
        const match = el.src.match(/index\.html\?(.+)/);
        if (!match) return '';
        try { return JSON.parse(atob(match[1])).type || ''; } catch { return ''; }
      }, i);

      if (fieldType) fieldMap[fieldType] = i;
    }
    return fieldMap;
  }

  /**
   * Fill a single Finix iframe field by its index.
   * Tries frameLocator input first, falls back to mouse+keyboard.
   */
  async fillFinixField(index: number, value: string, fieldName: string): Promise<boolean> {
    try {
      const frame = this.page.frameLocator('iframe[src*="finix.com"]').nth(index);
      const inputCount = await frame.locator('input').count().catch(() => 0);

      if (inputCount > 0) {
        const input = frame.locator('input').first();
        await input.click({ force: true });
        await this.page.waitForTimeout(200);
        await input.pressSequentially(value, { delay: 50 });
        await this.page.waitForTimeout(200);
        const val = await input.inputValue().catch(() => '');
        console.log(`[InvoicePaymentPage] ${fieldName}: typed "${value}", got="${val}"`);
        return true;
      } else {
        // Fallback: click iframe center + keyboard.type
        const iframeEl = this.L.finixIframes.nth(index);
        const box = await iframeEl.boundingBox();
        if (box) {
          await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await this.page.waitForTimeout(200);
          await this.page.keyboard.type(value, { delay: 50 });
          console.log(`[InvoicePaymentPage] ${fieldName}: typed via mouse+keyboard`);
          return true;
        }
      }
    } catch (e: any) {
      console.log(`[InvoicePaymentPage] ${fieldName}: error — ${e.message}`);
    }
    return false;
  }

  /**
   * Fill all card details using the Finix field map.
   */
  async fillAllCardDetails(data: CardDetails) {
    const fieldMap = await this.getFinixFieldMap();
    console.log(`[InvoicePaymentPage] Finix fields: ${Object.keys(fieldMap).join(', ')}`);

    if (fieldMap['name'] !== undefined) {
      await this.fillFinixField(fieldMap['name'], data.cardholderName || 'David Hall', 'Name');
    }
    if (fieldMap['number'] !== undefined) {
      await this.fillFinixField(fieldMap['number'], data.cardNumber || '4242424242424242', 'Card Number');
    }
    if (fieldMap['expiration_date'] !== undefined) {
      await this.fillFinixField(fieldMap['expiration_date'], data.cardExpiry || '1228', 'Expiration');
    }
    if (fieldMap['security_code'] !== undefined) {
      await this.fillFinixField(fieldMap['security_code'], data.cardCVV || '123', 'CVC');
    }
    if (fieldMap['address.line1'] !== undefined) {
      await this.fillFinixField(fieldMap['address.line1'], data.billingAddress || 'Nous Infosystems, 24th Main Road', 'Address');
    }
    if (fieldMap['address.city'] !== undefined) {
      await this.fillFinixField(fieldMap['address.city'], data.billingCity || 'Bengaluru', 'City');
    }
    if (fieldMap['address.region'] !== undefined) {
      await this.fillFinixField(fieldMap['address.region'], data.billingState || 'KA', 'State');
    }
    if (fieldMap['address.postal_code'] !== undefined) {
      await this.fillFinixField(fieldMap['address.postal_code'], data.billingZip || '560078', 'Postal Code');
    }
  }

  async clickSave() {
    await this.L.saveButton.click({ force: true });
    await this.L.kOverlay.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      console.log('[InvoicePaymentPage] k-overlay still visible after 15s');
    });
    await this.page.waitForTimeout(2000);
  }

  async clickConfirmAndPay() {
    // Remove k-overlay if still blocking
    await this.page.evaluate(() => {
      document.querySelectorAll('.k-overlay').forEach(el => el.remove());
    }).catch(() => {});
    await this.page.waitForTimeout(500);

    await this.L.confirmPayButton.click({ force: true });
    await this.page.waitForTimeout(5000);
  }

  async dismissConfirmation() {
    await waitAndDismissAnyKendoAlert(this.page);
  }

  // ── ACH / Bank Account Payment ──────────────────────────────────────────

  async selectBankAccountTab() {
    // Click "Bank Account" tab in the New Payment Method modal
    const bankTab = this.page.locator('text=Bank Account, a:has-text("Bank Account"), button:has-text("Bank Account")').first();
    const visible = await bankTab.isVisible().catch(() => false);
    if (visible) {
      await bankTab.click({ force: true });
      await this.page.waitForTimeout(2000);
      console.log('[InvoicePaymentPage] Switched to Bank Account tab');
    } else {
      // Try icon/tab approach
      await this.page.evaluate(() => {
        const els = document.querySelectorAll('a, button, span, div, li');
        for (const el of els) {
          if (el.textContent?.trim().includes('Bank Account')) {
            (el as HTMLElement).click();
            return;
          }
        }
      });
      await this.page.waitForTimeout(2000);
    }
  }

  async fillACHDetails(data: ACHDetails) {
    // Wait for ACH form fields to appear (may be Finix iframes or direct inputs)
    await this.page.waitForTimeout(2000);

    const finixCount = await this.L.finixIframes.count();
    if (finixCount > 0) {
      // Finix ACH uses iframes — decode field types from base64 tokens
      const fieldMap = await this.getFinixFieldMap();
      console.log(`[InvoicePaymentPage] ACH Finix fields: ${Object.keys(fieldMap).join(', ')}`);

      // Fill account name
      if (fieldMap['name'] !== undefined && data.accountName) {
        await this.fillFinixField(fieldMap['name'], data.accountName, 'Account Name');
      }
      // Fill account number
      if (fieldMap['account_number'] !== undefined) {
        await this.fillFinixField(fieldMap['account_number'], data.accountNumber || '1099999999', 'Account Number');
      }
      // Fill routing number / bank code
      if (fieldMap['bank_code'] !== undefined) {
        await this.fillFinixField(fieldMap['bank_code'], data.routingNumber || '122105278', 'Routing Number');
      }
      // Fill account type if present
      if (fieldMap['account_type'] !== undefined && data.accountType) {
        await this.fillFinixField(fieldMap['account_type'], data.accountType, 'Account Type');
      }
    } else {
      // Direct input fields (non-iframe)
      console.log('[InvoicePaymentPage] No Finix iframes for ACH — trying direct inputs');

      // Account name
      const nameField = this.page.locator('input[placeholder*="Name"], input[id*="name" i]').first();
      if (await nameField.isVisible().catch(() => false)) {
        await smartFill(nameField, data.accountName || 'John Smith');
      }

      // Account type dropdown
      const typeSelect = this.page.locator('select[id*="account" i], select[id*="type" i]').first();
      if (await typeSelect.isVisible().catch(() => false)) {
        await typeSelect.selectOption({ label: data.accountType || 'Personal Checking' });
      }

      // Account number
      const accField = this.page.locator('input[placeholder*="Account"], input[id*="account" i]').first();
      if (await accField.isVisible().catch(() => false)) {
        await smartFill(accField, data.accountNumber || '1099999999');
      }

      // Routing number
      const routingField = this.page.locator('input[placeholder*="Routing"], input[id*="routing" i]').first();
      if (await routingField.isVisible().catch(() => false)) {
        await smartFill(routingField, data.routingNumber || '122105278');
      }
    }
  }
}
