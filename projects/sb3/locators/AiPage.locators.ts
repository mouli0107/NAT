import { Page } from '@playwright/test';

export const AiPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  learnMoreLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Learn More\']').filter({ visible: true }).first(),
};
