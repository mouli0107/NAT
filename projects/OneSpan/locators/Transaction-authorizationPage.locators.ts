import { Page } from '@playwright/test';

export const Transaction-authorizationPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  resourcesButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Resources\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  blogLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Blog\']').filter({ visible: true }).first(),
};
