import { Page } from '@playwright/test';

export const CustomerSearchPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  firstNameInput: (page: Page) => page.locator('xpath=//input[@name=\'fname\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  selectcustomertypeSelect: (page: Page) => page.locator('xpath=//select[@name=\'selectCustomerType\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  searchButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'SEARCH\']').filter({ visible: true }).first(),
};
