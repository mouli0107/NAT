import { Page } from '@playwright/test';

export const AuthenticationPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  getStartedLink: (page: Page) => page.locator('xpath=//a[@aria-label=\'Get Started about Authentication\']').filter({ visible: true }).first(),
  pageHeading: (page: Page): Locator => page.locator("xpath=//banner//h1[normalize-space(text())='Authentication']"),
  subheading: (page: Page): Locator => page.locator("xpath=//banner//h2[contains(text(),
  searchLink: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Top header navigation']//a[normalize-space(text())='Search']"),
  requestDemoLink: (page: Page): Locator => page.locator("xpath=//nav//a[normalize-space(text())='Request demo']"),
  intelligentAdaptiveAuthLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Learn More' and contains(@href,
  mobileSecuritySuiteLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Learn more' and contains(@href,
  mobileAuthenticatorsLink: (page: Page): Locator => page.locator("xpath=//a[normalize-space(text())='Learn more' and contains(@href,
  productsMenuButton: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Main Header Navigation']//button[normalize-space(text())='Products']"),
  solutionsMenuButton: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Main Header Navigation']//button[normalize-space(text())='Solutions']"),
  resourcesButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Resources\']').filter({ visible: true }).first(),
  communityPortalLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Community Portal\']').filter({ visible: true }).first(),
};
