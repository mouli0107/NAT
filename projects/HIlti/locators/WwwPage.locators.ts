import { Page } from '@playwright/test';

export const WwwPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  agreeButton: (page: Page) => page.locator('xpath=//*[@id=\'didomi-notice-agree-button\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  productsButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Products\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  powerToolsLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Power tools\']').filter({ visible: true }).first(),
  searchInput: (page: Page): Locator => page.locator("xpath=//input[@role='combobox']"),
  searchButton: (page: Page): Locator => page.locator("xpath=//button[normalize-space(text())='Search Field']"),
  homeLink: (page: Page): Locator => page.locator("xpath=//header//a[normalize-space(text())='Home']"),
  loginLink: (page: Page): Locator => page.locator("xpath=//header//a[normalize-space(text())='Log in or Register']"),
  cartLink: (page: Page): Locator => page.locator("xpath=//header//a[normalize-space(text())='Cart']"),
  ordersLink: (page: Page): Locator => page.locator("xpath=//header//a[normalize-space(text())='Orders']"),
  contactButton: (page: Page): Locator => page.locator("xpath=//header//button[normalize-space(text())='Contact‎']"),
  solutionsButton: (page: Page): Locator => page.locator("xpath=//button[normalize-space(text())='Solutions']"),
  engineeringCenterLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Engineering Center']"),
  supportButton: (page: Page): Locator => page.locator("xpath=//button[normalize-space(text())='Support and Downloads']"),
  companyButton: (page: Page): Locator => page.locator("xpath=//button[normalize-space(text())='Company']"),
  shopNowPromoLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Shop now']"),
  registerTodayLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Register today']"),
};
