import { Page, Locator } from '@playwright/test';

export const HiltiHomePageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(normalize-space(text()),'Agree')]
  agreeButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Agree") and contains(normalize-space(text()),"Agree to our data processing")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(normalize-space(text()),'Skip to main')]
  skipToMainContentLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Skip to main content")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[@href="/cart"]
  cartLink: (page: Page): Locator => page.locator('xpath=//banner//a[contains(@href,"/cart")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="search"]
  searchInput: (page: Page): Locator => page.locator('xpath=//input[@role="combobox" and @aria-label="Search"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),'Search')]
  searchButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Search Field"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Products']
  productsMenuButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Products"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Solutions']
  solutionsMenuButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Solutions"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),'Support')]
  supportMenuButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Support and Downloads")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[text()='Company']
  companyMenuButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Company"]'),
  
  // Uniqueness: unique | Stability: fragile - promotional content | Fallback: //main//h1[1]
  mainHeading: (page: Page): Locator => page.locator('xpath=//main//h1[1]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(text(),'Shop now')]
  shopNowLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Shop now")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),'Pause')]
  pauseAutoplayButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Pause autoplay"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),'Quick Item')]
  quickItemEntryButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Quick Item Number Entry")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),'Log in')]
  loginLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Log in or Register")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),'Orders')]
  ordersLink: (page: Page): Locator => page.locator('xpath=//banner//a[contains(normalize-space(text()),"Orders")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[@aria-label='Contact']
  contactButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Contact‎"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href="/engineering"]
  engineeringCenterLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"/engineering") and contains(normalize-space(text()),"Engineering Center")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[@href="/"]
  homeLink: (page: Page): Locator => page.locator('xpath=//banner//a[@href="/" and .//img[@alt="HILTI logo"]]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),'Toggle navigation')]
  toggleMenuButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Toggle navigation menu")]')
};