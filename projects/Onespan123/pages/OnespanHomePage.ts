import { Page } from '@playwright/test';
import { OnespanHomePageLocators } from '@locators/OnespanHomePage.locators';

export class OnespanHomePage {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async clickProductsButton(): Promise<void> {
    const loc = OnespanHomePageLocators.productsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async waitForSolutionHeadingVisible(): Promise<void> {
    const loc = OnespanHomePageLocators.solutionHeading(this.page);
    await loc.waitFor({ state: 'visible', timeout: 10000 });
  }

  async isSolutionHeadingVisible(): Promise<boolean> {
    const loc = OnespanHomePageLocators.solutionHeading(this.page);
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      return await loc.isVisible();
    } catch {
      return false;
    }
  }

  async getSolutionHeadingText(): Promise<string> {
    const loc = OnespanHomePageLocators.solutionHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }
}