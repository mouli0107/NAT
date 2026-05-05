import { Page } from '@playwright/test';

export const Request-a-demoPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  firstNameInput: (page: Page) => page.locator('xpath=//*[@id=\'FirstName\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  lastNameInput: (page: Page) => page.locator('xpath=//*[@id=\'LastName\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  emailInput: (page: Page) => page.locator('xpath=//*[@id=\'Email\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  companyInput: (page: Page) => page.locator('xpath=//*[@id=\'Company\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  industrySelect: (page: Page) => page.locator('xpath=//*[@id=\'Industry\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  phoneInput: (page: Page) => page.locator('xpath=//*[@id=\'Phone\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  countrySelect: (page: Page) => page.locator('xpath=//*[@id=\'Country\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  businessInterestCSelect: (page: Page) => page.locator('xpath=//*[@id=\'Business_Interest__c\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  commentsOptionalInput: (page: Page) => page.locator('xpath=//*[@id=\'Web_Form_Comments__c\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  submitButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Submit\']').filter({ visible: true }).first(),
  requestDemoLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Request demo\']').filter({ visible: true }).first(),
  pcConsOptinrequestCheckbox: (page: Page) => page.locator('xpath=//*[@id=\'mktoCheckbox_240677_0\']').filter({ visible: true }).first(),
};
