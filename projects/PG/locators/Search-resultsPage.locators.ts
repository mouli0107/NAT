import { Page } from '@playwright/test';

export const Search-resultsPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  blogLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Blog\']'),
};
