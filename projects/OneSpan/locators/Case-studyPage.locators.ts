import { Page } from '@playwright/test';

export const Case-studyPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  requestDemoLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Request demo\']').filter({ visible: true }).first(),
};
