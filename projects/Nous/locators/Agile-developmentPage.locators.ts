// AgileDevelopmentPage locators — clean 5-layer pattern
// File kept as AgileDevelopmentPage (hyphen removed from identifier).
// Navigation to this page is handled by NousinfosystemsHomePage.navigateToAgileDevelopment().
import { Page, Locator } from '@playwright/test';

export const AgileDevelopmentPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'data-visualization')]
  dataVisualizationLink: (page: Page): Locator =>
    page.locator('xpath=//a[normalize-space(text())="Data Visualization"]'),
};
