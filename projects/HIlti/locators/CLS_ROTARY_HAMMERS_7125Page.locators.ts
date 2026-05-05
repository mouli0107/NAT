import { Page } from '@playwright/test';

export const CLS_ROTARY_HAMMERS_7125PageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  indiaButton: (page: Page) => page.locator('xpath=//button[@aria-label=\'India\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  japanButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Japan\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  changeCountryButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'CHANGE COUNTRY\']').filter({ visible: true }).first(),
};
