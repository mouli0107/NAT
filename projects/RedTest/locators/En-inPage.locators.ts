import { Page } from '@playwright/test';

export const En-inPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  allMicrosoftButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'All Microsoft\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  windowsAppsLink: (page: Page) => page.locator('xpath=//*[@id=\'shellmenu_9\']').filter({ visible: true }).first(),
};
