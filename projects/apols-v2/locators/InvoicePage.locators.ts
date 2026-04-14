import { Page } from '@playwright/test';

export function InvoicePageLocators(page: Page) {
  return {
    myPaymentsTab: page.locator('a:has-text("My Payments")').first(),
    //  ↳ "My Payments" tab link at the top

    invoiceCheckbox: page.locator('input[type="checkbox"][id*="chkInvoice"]').first(),
    //  ↳ First invoice checkbox in the grid

    payNowButton: page.locator('#btnPayNow, button:has-text("Pay Now")').first(),
    //  ↳ "Pay Now" button

    showClosedInvoiceButton: page.locator('button:has-text("Show Closed Invoice"), #btnShowClosedInvoice').first(),
    //  ↳ "Show Closed Invoice" toggle button

    warningDoneButton: page.locator('.k-window button:has-text("Done"), button:has-text("Done")').first(),
    //  ↳ "Done" button on warning popup
  };
}

export type InvoicePageLocatorMap = ReturnType<typeof InvoicePageLocators>;
