import { Page, Locator } from '@playwright/test';

export const XDFramePageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(), 'Marketo Forms')]
  pageHeading: (page: Page): Locator => page.locator("xpath=//h2[normalize-space(text())='This page is used by Marketo Forms 2 to proxy cross domain AJAX requests.']"),
};