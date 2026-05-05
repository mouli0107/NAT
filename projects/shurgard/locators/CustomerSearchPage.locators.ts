import { Page } from '@playwright/test';

export const CustomerSearchPageLocators = (page: Page) => ({
  // General search input (used as "page ready" signal)
  customerInput: page.locator("xpath=//*[@id='quantity1']").filter({ visible: true }).first(),

  // TC003 — Add New Customer
  // CSS text-transform: uppercase displays "NEW CUSTOMER" but DOM text may be mixed-case.
  newCustomerButton: page.locator(
    "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'new customer')]"
  ).filter({ visible: true }).first(),

  // TC004 — Customer Search form fields
  firstNameInput: page.locator("xpath=//input[@name='fname']").filter({ visible: true }).first(),
  customerTypeSelect: page.locator("xpath=//select[@name='selectCustomerType']").filter({ visible: true }).first(),
  searchButton: page.locator(
    "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'search')]"
  ).filter({ visible: true }).first(),
});
