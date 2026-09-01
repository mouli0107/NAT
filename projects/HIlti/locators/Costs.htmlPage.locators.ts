import { Page } from '@playwright/test';

export const Costs.htmlPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  healthAndSafetyLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Health and safety\']').filter({ visible: true }).first(),
};
