import { Page } from '@playwright/test';
import { BrandsBlueAnimatedSvgPageLocators } from '../locators/BrandsBlueAnimatedSvgPage.locators';

export class BrandsBlueAnimatedSvgPage {
  readonly page: Page;
  readonly url: string = 'https://images.ctfassets.net/oggad6svuzkv/5knYdiyBeWdLKYPkoRKUbC/cf1a07be9e700970cb499bc6d9bc66d1/Brands_Blue_-_animated.svg';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async waitForSvgToLoad(): Promise<void> {
    const svgLocator = BrandsBlueAnimatedSvgPageLocators.svgRoot(this.page);
    await svgLocator.waitFor({ state: 'visible' });
  }

  async isPageLoaded(): Promise<boolean> {
    const pageRootLocator = BrandsBlueAnimatedSvgPageLocators.pageRoot(this.page);
    await pageRootLocator.waitFor({ state: 'attached' });
    return await pageRootLocator.isVisible();
  }

  async getSvgContent(): Promise<string | null> {
    const svgLocator = BrandsBlueAnimatedSvgPageLocators.svgRoot(this.page);
    await svgLocator.waitFor({ state: 'visible' });
    return await svgLocator.innerHTML();
  }
}