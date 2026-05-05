import { Page } from '@playwright/test';

export const InfrastructureManagementPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  careersLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Careers\']').filter({ visible: true }).first(),
};
