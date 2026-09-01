import { Page } from '@playwright/test';

export const WwwPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  agreeButton: (page: Page) => page.locator('xpath=//*[@id=\'didomi-notice-agree-button\']').filter({ visible: true }).first(),
};
