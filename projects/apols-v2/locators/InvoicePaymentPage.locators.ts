import { Page } from '@playwright/test';

export function InvoicePaymentPageLocators(page: Page) {
  return {
    newPaymentMethodLink: page.locator('#spnNewPaymentMethod, a:has-text("New Payment Method")').first(),
    //  ↳ "+ New Payment Method" link/span

    finixIframes: page.locator('iframe[src*="finix.com"]'),
    //  ↳ All Finix payment field iframes

    saveButton: page.locator('.k-window button:has-text("Save"), #btnSave, button.btn-primary:has-text("Save")').first(),
    //  ↳ Save button inside the "New Payment Method Details" modal

    confirmPayButton: page.locator('#btnContinue, button:has-text("Confirm & Pay")').first(),
    //  ↳ "Confirm & Pay" button on the payment page

    kOverlay: page.locator('.k-overlay'),
    //  ↳ Kendo modal overlay (blocks clicks when modal is open)
  };
}

export type InvoicePaymentPageLocatorMap = ReturnType<typeof InvoicePaymentPageLocators>;
