import { Page } from '@playwright/test';

export const CustomerInquiryListPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  inquiry1Link: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Inquiry 1\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  ddMmYyyyInput: (page: Page) => page.locator('xpath=//input[@name=\'NeedDate\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  inquirywhySelect: (page: Page) => page.locator('xpath=//*[@id=\'inquiry-why\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  numberInput: (page: Page) => page.locator('xpath=//textarea[@name=\'editWhat\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  inquiryobjectionSelect: (page: Page) => page.locator('xpath=//*[@id=\'inquiry-Objection\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  inquiryocobjectionSelect: (page: Page) => page.locator('xpath=//*[@id=\'inquiry-OCObjection\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  saveButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'SAVE\']').filter({ visible: true }).first(),
};
