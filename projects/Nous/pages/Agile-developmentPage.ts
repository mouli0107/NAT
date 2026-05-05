// AgileDevelopmentPage — clean 5-layer POM.
// Identifier hyphen removed: class is AgileDevelopmentPage (not Agile-developmentPage).
// No assertions, no absolute URLs, no inline selectors.
import { Page } from '@playwright/test';
import { AgileDevelopmentPageLocators } from '@locators/Agile-developmentPage.locators';

export class AgileDevelopmentPage {
  constructor(private readonly page: Page) {}

  async clickDataVisualization(): Promise<void> {
    const loc = AgileDevelopmentPageLocators.dataVisualizationLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }
}
