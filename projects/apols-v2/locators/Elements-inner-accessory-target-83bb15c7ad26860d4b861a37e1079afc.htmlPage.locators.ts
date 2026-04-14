import { Page } from '@playwright/test';

export const Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  input1234123412341234Input: (page: Page) => page.locator('xpath=//*[@id=\'payment-numberInput\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  mmYyInput: (page: Page) => page.locator('xpath=//*[@id=\'payment-expiryInput\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  cvcInput: (page: Page) => page.locator('xpath=//*[@id=\'payment-cvcInput\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  billingaddressNameinputInput: (page: Page) => page.locator('xpath=//*[@id=\'billingAddress-nameInput\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  countrySelect: (page: Page) => page.locator('xpath=//*[@id=\'billingAddress-countryInput\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  billingaddressAddressline1inInput: (page: Page) => page.locator('xpath=//*[@id=\'billingAddress-addressLine1Input\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  billingaddressLocalityinputInput: (page: Page) => page.locator('xpath=//*[@id=\'billingAddress-localityInput\']').filter({ visible: true }).first(),
};
