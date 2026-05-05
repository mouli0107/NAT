import { Page, Locator } from '@playwright/test';

export const OnespanHomePageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(normalize-space(text()),'Products')]
  productsButton: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Main Navigation"]//button[contains(normalize-space(text()),"Products")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //h2[contains(normalize-space(text()),'Solution')]
  solutionHeading: (page: Page): Locator => page.locator('xpath=//*[contains(normalize-space(text()),"Solution")]'),
};