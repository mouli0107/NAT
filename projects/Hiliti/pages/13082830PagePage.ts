import { Page } from '@playwright/test';
import { Page13082830PageLocators } from '@locators/Page13082830Page.locators';

export class Page13082830Page {
  constructor(private readonly page: Page) {}

  async navigateToPage(): Promise<void> {
    // Navigate to the tracking pixel page - using relative URL
    await this.page.goto('/activityi');
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async waitForTrackingPixelToLoad(): Promise<void> {
    const loc = Page13082830PageLocators.trackingPixelImage(this.page);
    await loc.waitFor({ state: 'attached', timeout: 10000 });
  }

  async isProductTextEnabled(): Promise<boolean> {
    const loc = Page13082830PageLocators.productText(this.page);
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      return await loc.isEnabled();
    } catch {
      return false;
    }
  }

  async getProductTextContent(): Promise<string> {
    const loc = Page13082830PageLocators.productText(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  async isTrackingPixelPresent(): Promise<boolean> {
    const loc = Page13082830PageLocators.trackingPixelImage(this.page);
    try {
      await loc.waitFor({ state: 'attached', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    // Wait for tracking pixel to be present
    await this.waitForTrackingPixelToLoad().catch(() => {});
  }
}