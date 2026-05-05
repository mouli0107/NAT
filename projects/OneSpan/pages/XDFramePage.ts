import { Page } from '@playwright/test';
import { XDFramePageLocators } from '../locators/XDFramePage.locators';

export class XDFramePage {
  constructor(private page: Page) {}

  async navigateTo(): Promise<void> {
    await this.page.goto('https://secure.onespan.com/index.php/form/XDFrame');
    await this.page.waitForLoadState('networkidle');
  }

  async isPageHeadingVisible(): Promise<boolean> {
    const heading = XDFramePageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    return await heading.isVisible();
  }

  async getPageHeadingText(): Promise<string> {
    const heading = XDFramePageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    const text = await heading.textContent();
    return text || '';
  }

  async verifyPageLoaded(): Promise<void> {
    const heading = XDFramePageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible', timeout: 10000 });
  }
}