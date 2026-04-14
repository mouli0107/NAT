import { Page } from '@playwright/test';

export const Index.htmlPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  fullNameInput: (page: Page) => page.locator('xpath=//input[@name=\'name\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  input4111111111111111Input: (page: Page) => page.locator('xpath=//input[@name=\'number\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  mmYyInput: (page: Page) => page.locator('xpath=//input[@name=\'expiration_date\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  cvcInput: (page: Page) => page.locator('xpath=//input[@name=\'security_code\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  addressLine1Input: (page: Page) => page.locator('xpath=//input[@name=\'address.line1\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  cityInput: (page: Page) => page.locator('xpath=//input[@name=\'address.city\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  addressRegionSelect: (page: Page) => page.locator('xpath=//select[@name=\'address.region\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  zipInput: (page: Page) => page.locator('xpath=//input[@name=\'address.postal_code\']').filter({ visible: true }).first(),
};
