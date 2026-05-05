import { Page, Locator } from '@playwright/test';

export const NousinfosystemsContactPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]//a[contains(text(),"Careers")]
  careersLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[contains(normalize-space(text()),"Careers")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]//a[contains(text(),"Contact")]
  contactUsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[contains(normalize-space(text()),"Contact Us")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="text" and contains(@placeholder,"Name")]
  nameInput: (page: Page): Locator => page.locator('xpath=//input[@name="your-name"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="email" and contains(@placeholder,"Email")]
  emailInput: (page: Page): Locator => page.locator('xpath=//input[@name="your-email"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="tel" and contains(@placeholder,"Phone")]
  phoneNumberInput: (page: Page): Locator => page.locator('xpath=//input[@id="phoneNumberInput"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="text" and contains(@placeholder,"Company")]
  companyNameInput: (page: Page): Locator => page.locator('xpath=//input[@name="your-subject"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //textarea[contains(@placeholder,"Message")]
  messageTextarea: (page: Page): Locator => page.locator('xpath=//textarea[@name="your-message"]'),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //input[@type="checkbox" and contains(@name,"checkbox")]
  consentCheckbox: (page: Page): Locator => page.locator('xpath=//input[@name="checkbox-815[]"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"services/infrastructure-management")]
  infrastructureManagementLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"services/infrastructure-management")]')
};