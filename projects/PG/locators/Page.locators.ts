import { Page } from '@playwright/test';

export const PageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  introButton: (page: Page) => page.locator('xpath=//*[@id=\'hp-item-nav-0\']'),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  searchHere: (page: Page) => page.locator('xpath=//*[@id=\'__next\']//label'),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  searchInput: (page: Page) => page.locator('xpath=//*[@id=\'6ksJIHiOacMiUIGWiIs68M\']'),
};
