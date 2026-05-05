import { Page } from '@playwright/test';

export const CLS_POWER_TOOLS_7125PageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  rotaryHammersLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Rotary hammers\']').filter({ visible: true }).first(),
};
