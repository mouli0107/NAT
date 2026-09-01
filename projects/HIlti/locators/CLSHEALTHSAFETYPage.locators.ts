import { Page } from '@playwright/test';

export const CLSHEALTHSAFETYPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  constructionExoskeletonsLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Construction exoskeletons\']').filter({ visible: true }).first(),
};
