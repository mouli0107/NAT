import { Page } from '@playwright/test';

export const PageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  aiButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'AI\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  smartbearAiExploreOurAiTechnLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'SmartBear AI Explore our AI Technology\']').filter({ visible: true }).first(),
};
