import { Page, Locator } from '@playwright/test';

export const RequestADemoPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='FirstName']
  firstNameInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'FirstName\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='LastName']
  lastNameInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'LastName\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='Email']
  emailInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'Email\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='Company']
  companyInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'Company\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='Industry']
  industryInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'Industry\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='Phone']
  phoneInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'Phone\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='Country']
  countryInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'Country\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='Business_Interest__c']
  businessInterestInput: (page: Page): Locator => page.locator('xpath=//input[@id=\'Business_Interest__c\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //textarea[@name='Web_Form_Comments__c']
  commentsInput: (page: Page): Locator => page.locator('xpath=//*[@id=\'Web_Form_Comments__c\']'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //button[@type='submit']
  submitButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())=\'Submit\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h1[contains(text(),'Request')]
  pageHeading: (page: Page): Locator => page.locator('xpath=//h1[normalize-space(text())=\'Request a live demo\']'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //article//h3
  formSubheading: (page: Page): Locator => page.locator('xpath=//h3[normalize-space(text())=\'Get a personalized demo in a few easy steps\']'),
  closeButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Close"]'),
  industryDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="Industry"]'),
  countryDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="Country"]'),
  businessInterestDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="Business_Interest__c"]'),
  acceptAllCookiesButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Accept All Cookies"]'),
  rejectAllCookiesButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Reject All Cookies"]'),
};
