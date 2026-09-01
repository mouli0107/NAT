import { Page } from '@playwright/test';

export const R14012433PageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  addToCartButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'ADD TO CART\']').filter({ visible: true }).first(),
};
