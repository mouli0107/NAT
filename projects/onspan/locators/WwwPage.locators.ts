import { Page } from '@playwright/test';

export const WwwPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  resourcesButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Resources\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  solutionsButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Solutions\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  companyButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Company\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  contactUsLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Contact Us\']').filter({ visible: true }).first(),
};
