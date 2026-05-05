import { Page, Locator } from '@playwright/test';

export const OnespanHomePageLocators = {
  // Uniqueness: verify | Stability: fragile - link text may change | Fallback: //a[contains(@href,'fido')]
  fidoHardwareAuthenticatorsLink: (page: Page): Locator => 
    page.locator('xpath=//a[contains(normalize-space(text()),"FIDO Hardware Authenticators")]'),
};