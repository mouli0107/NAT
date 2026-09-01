import { Page, Locator } from '@playwright/test';

export const Page13082830PageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //img[contains(@src,'doubleclick.net')]
  trackingPixelImage: (page: Page): Locator => page.locator('xpath=//img'),
  
  // Uniqueness: verify | Stability: fragile - text may vary | Fallback: //*[contains(text(),'Product')]
  productText: (page: Page): Locator => page.locator('xpath=//*[contains(normalize-space(text()),"Product")]'),
};