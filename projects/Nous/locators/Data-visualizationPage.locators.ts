// DataVisualizationPage locators — clean 5-layer pattern.
// Identifier hyphen removed: export is DataVisualizationPageLocators.
// Full locator coverage is in DataAnalyticsDataVisualizationPage.locators.ts.
// This file covers the in-page accordion/capability buttons.
import { Page, Locator } from '@playwright/test';

export const DataVisualizationPageLocators = {
  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Versatile")]
  versatileSolutionsButton: (page: Page): Locator =>
    page.locator('xpath=//button[normalize-space(text())="Versatile solutions regardless of company size"]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Local knowledge")]
  localKnowledgeButton: (page: Page): Locator =>
    page.locator('xpath=//button[normalize-space(text())="Local knowledge, global relevance"]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Excellence center")]
  excellenceCenterButton: (page: Page): Locator =>
    page.locator('xpath=//button[normalize-space(text())="Excellence center for data visualization"]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Custom accelerators")]
  customAcceleratorsButton: (page: Page): Locator =>
    page.locator('xpath=//button[normalize-space(text())="Custom accelerators, assured results"]'),
};
