import { Page } from '@playwright/test';

export const CustomerInquiryListPageLocators = (page: Page) => ({
  // TC005 — Customer Inquiry list rows
  // Matches any inquiry link by name (e.g. "Inquiry 1")
  inquiryLink: (name: string) =>
    page.locator(`xpath=//a[contains(normalize-space(text()),'${name}')]`)
      .filter({ visible: true }).first(),
});
