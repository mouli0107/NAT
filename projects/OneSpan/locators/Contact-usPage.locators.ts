import { Page } from '@playwright/test';

export const Contact-usPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  requestDemoLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Request demo\']').filter({ visible: true }).first(),
  companyButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Company\']').filter({ visible: true }).first(),
  careersLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Careers\']').filter({ visible: true }).first(),
};
