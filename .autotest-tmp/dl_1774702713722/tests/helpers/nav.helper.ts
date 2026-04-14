import { Page } from '@playwright/test';

export class NavHelper {
  constructor(private page: Page) {}

  async navigateTo(url: string): Promise<void> {
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (response && response.status() >= 400) {
      throw new Error('Navigation to ' + url + ' returned HTTP ' + response.status());
    }
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async clickLink(text: string): Promise<void> {
    await this.page.getByRole('link', { name: text }).first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
