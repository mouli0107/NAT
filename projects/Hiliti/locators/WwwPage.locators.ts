import { Page, Locator } from '@playwright/test';

export const WwwPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //header//button[text()='Solutions']
  solutionsButton: (page: Page): Locator => 
    page.locator('xpath=//button[normalize-space(text())="Solutions"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //header//button[text()='Products']
  productsButton: (page: Page): Locator => 
    page.locator('xpath=//button[normalize-space(text())="Products"]'),

  // Uniqueness: verify | Stability: fragile — consent text may vary | Fallback: //button[contains(@aria-label, 'Agree')]
  agreeButton: (page: Page): Locator => 
    page.locator('xpath=//button[contains(normalize-space(text()), "Agree to our data processing")]'),

  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[contains(@href, "power-tools")]
  powerToolsLink: (page: Page): Locator => 
    page.locator('xpath=//a[normalize-space(text())="Power tools"]'),

  // Uniqueness: verify | Stability: fragile — promotional text | Fallback: //a[contains(@href, "profis") and contains(@href, "engineering")]
  exploreProfisEngineeringLink: (page: Page): Locator => 
    page.locator('xpath=//a[contains(normalize-space(text()), "EXPLORE PROFIS ENGINEERING")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="search"]
  searchCombobox: (page: Page): Locator => 
    page.locator('xpath=//input[@role="combobox" and contains(@aria-label, "Search")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), "Search")]
  searchButton: (page: Page): Locator => 
    page.locator('xpath=//button[normalize-space(text())="Search Field"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href, "/cart")]
  cartLink: (page: Page): Locator => 
    page.locator('xpath=//a[normalize-space(text())="Cart"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href, "login")]
  loginRegisterLink: (page: Page): Locator => 
    page.locator('xpath=//a[normalize-space(text())="Log in or Register"]'),

  // Uniqueness: verify | Stability: stable | Fallback: //a[@href="/"]/img[@alt="HILTI logo"]
  homeLogo: (page: Page): Locator => 
    page.locator('xpath=//img[@alt="HILTI logo"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href, "engineering")]
  engineeringCenterLink: (page: Page): Locator => 
    page.locator('xpath=//a[normalize-space(text())="Engineering Center"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(), "Support")]
  supportAndDownloadsButton: (page: Page): Locator => 
    page.locator('xpath=//button[normalize-space(text())="Support and Downloads"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[text()="Company"]
  companyButton: (page: Page): Locator => 
    page.locator('xpath=//button[normalize-space(text())="Company"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[@aria-label="Contact"]
  contactButton: (page: Page): Locator => 
    page.locator('xpath=//button[normalize-space(text())="Contact‎"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href, "/orders")]
  ordersLink: (page: Page): Locator => 
    page.locator('xpath=//a[normalize-space(text())="Orders"]'),

  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(@href, "profis-engineering")]
  learnMoreProfisLink: (page: Page): Locator => 
    page.locator('xpath=//a[normalize-space(text())="Learn more about PROFIS Engineering"]'),
};