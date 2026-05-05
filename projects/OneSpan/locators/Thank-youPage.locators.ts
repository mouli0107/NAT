import { Page } from '@playwright/test';

export const Thank-youPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  thankYou: (page: Page) => page.locator('xpath=//h1[contains(normalize-space(text()),\'Thank you!\')]').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  thankYouForRequestingADemoFr: (page: Page) => page.locator('xpath=//p[contains(normalize-space(text()),\'Thank you for requesting a demo from OneSpan. We can’t wait \')]').filter({ visible: true }).first(),
};
