import { Page, Locator } from '@playwright/test';

export const GvvvGdmiqjccvc7cMessengerPageLocators = {
  // Uniqueness: unique | Stability: fragile - text based | Fallback: //button[contains(text(),'Reque')]
  requestDemoButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Reque t a demo"]'),
  
  // Uniqueness: unique | Stability: fragile - text based | Fallback: //text()[contains(.,"Featured")]
  featuredServicesText: (page: Page): Locator => page.locator('xpath=//*[normalize-space(text())="Featured  ervice "]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //nav//button[contains(text(),"Company")]
  companyButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Company"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //nav//button[contains(text(),"Resources")]
  resourcesButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Resources"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(@href,"community")]
  communityPortalLink: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="Community Portal"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(text(),"Contact")]
  contactUsLink: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="Contact Us"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //input[@name="FirstName"]
  firstNameInput: (page: Page): Locator => page.locator('xpath=//input[@id="FirstName"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //input[@name="LastName"]
  lastNameInput: (page: Page): Locator => page.locator('xpath=//input[@id="LastName"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //input[@name="Email"]
  emailInput: (page: Page): Locator => page.locator('xpath=//input[@id="Email"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //input[@name="Title"]
  titleInput: (page: Page): Locator => page.locator('xpath=//input[@id="Title"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //input[@name="Company"]
  companyInput: (page: Page): Locator => page.locator('xpath=//input[@id="Company"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //input[@name="Phone"]
  phoneInput: (page: Page): Locator => page.locator('xpath=//input[@id="Phone"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //select[@name="Industry"]
  industryDropdown: (page: Page): Locator => page.locator('xpath=//select[contains(@name,"Industry") or contains(@id,"Industry")]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //select[@name="Business_Interest__c"]
  businessInterestDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="Business_Interest__c"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //select[@name="Country"]
  countryDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="Country"]'),
  
  // Uniqueness: unique | Stability: stable - id attribute | Fallback: //textarea[@name="Web_Form_Comments__c"]
  commentsTextarea: (page: Page): Locator => page.locator('xpath=//textarea[@id="Web_Form_Comments__c"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //label[contains(text(),"First Name")]
  firstNameLabel: (page: Page): Locator => page.locator('xpath=//label[normalize-space(text())="First Name *"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //label[contains(text(),"Business Email")]
  businessEmailLabel: (page: Page): Locator => page.locator('xpath=//label[normalize-space(text())="Business Email *"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //label[contains(text(),"Comments")]
  commentsLabel: (page: Page): Locator => page.locator('xpath=//label[contains(text(),"Comments (optional)")]')
};