import { Page } from '@playwright/test';

export const BlogPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  cybersecurityPricingContactALink: (page: Page) => page.locator('xpath=//a[@aria-label=\'Cybersecurity Pricing Contact a OneSpan representative\']').filter({ visible: true }).first(),
};
