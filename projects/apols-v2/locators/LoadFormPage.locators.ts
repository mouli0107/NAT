import { Page } from '@playwright/test';

export const LoadFormPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  myPaymentsLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'My Payments\']').filter({ visible: true }).first(),
};
