import { Page } from '@playwright/test';

export const CLSPOWERTOOLS7125PageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  changeCountryButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'CHANGE COUNTRY\']').filter({ visible: true }).first(),
};
