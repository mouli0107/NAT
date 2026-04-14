import { Page, Locator } from '@playwright/test';

export const SmartbearPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(normalize-space(text()), 'Allow') and contains(normalize-space(text()), 'cookies')]
  allowAllCookiesButton: (page: Page): Locator => page.locator("xpath=//button[normalize-space(text())='Allow all cookies']"),
  
  // Uniqueness: verify — scoped to navigation | Stability: stable | Fallback: //button[normalize-space(text())='AI']
  aiButton: (page: Page): Locator => page.locator("xpath=//nav//button[normalize-space(text())='AI']"),
  
  // Uniqueness: verify — scoped to navigation | Stability: stable | Fallback: //button[normalize-space(text())='Products']
  productsButton: (page: Page): Locator => page.locator("xpath=//nav//button[normalize-space(text())='Products']"),
  
  // Uniqueness: verify — scoped to navigation | Stability: stable | Fallback: //button[normalize-space(text())='Resources']
  resourcesButton: (page: Page): Locator => page.locator("xpath=//nav//button[normalize-space(text())='Resources']"),
  
  // Uniqueness: verify — scoped to navigation | Stability: stable | Fallback: //button[contains(normalize-space(text()), 'SmartBear')]
  whySmartbearButton: (page: Page): Locator => page.locator("xpath=//nav//button[normalize-space(text())='Why SmartBear']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(normalize-space(text()), 'Application') and contains(normalize-space(text()), 'Integrity')]
  applicationIntegrityLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Application Integrity']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //main//h1[1]
  mainHeading: (page: Page): Locator => page.locator("xpath=//main//h1[normalize-space(text())='Build Quality Software at AI Speed and Scale']"),
  
  // Uniqueness: verify — scoped to navigation | Stability: stable | Fallback: //a[contains(@href, 'store')]
  storeLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Store']"),
  
  // Uniqueness: verify — scoped to navigation | Stability: stable | Fallback: //a[contains(@href, 'support')]
  supportLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Support']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[normalize-space(text())='Login']
  loginLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Login']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(@href, 'product') and contains(text(), 'Explore')]
  exploreProductsLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Explore Products']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(@href, 'contact')]
  talkWithUsLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Talk with us']"),
};