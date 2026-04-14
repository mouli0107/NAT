import { Page } from '@playwright/test';
import { MakingADifferenceRedAnimatedSvgPageLocators } from '../locators/MakingADifferenceRedAnimatedSvgPage.locators';

export class MakingADifferenceRedAnimatedSvgPage {
  private readonly page: Page;
  private readonly url = 'https://images.ctfassets.net/oggad6svuzkv/6OZlma6iwl3YCtEZJDYgNf/fe4b93cdade459f6cf8c392e246916eb/Making_a_difference_Red_-_animated.svg';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async isLoaded(): Promise<boolean> {
    const svgElement = MakingADifferenceRedAnimatedSvgPageLocators.svgElement(this.page);
    await svgElement.waitFor({ state: 'visible' });
    return await svgElement.isVisible();
  }

  async waitForSvgLoad(): Promise<void> {
    const svgElement = MakingADifferenceRedAnimatedSvgPageLocators.svgElement(this.page);
    await svgElement.waitFor({ state: 'visible' });
  }

  async getSvgContent(): Promise<string> {
    const svgElement = MakingADifferenceRedAnimatedSvgPageLocators.svgElement(this.page);
    await svgElement.waitFor({ state: 'visible' });
    return await svgElement.innerHTML();
  }
}