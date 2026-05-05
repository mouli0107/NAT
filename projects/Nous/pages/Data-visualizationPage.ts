// DataVisualizationPage — clean 5-layer POM.
// Identifier hyphen removed: class is DataVisualizationPage (not Data-visualizationPage).
// No assertions, no absolute URLs, no inline selectors.
import { Page } from '@playwright/test';
import { DataVisualizationPageLocators } from '@locators/Data-visualizationPage.locators';

export class DataVisualizationPage {
  constructor(private readonly page: Page) {}

  async clickVersatileSolutions(): Promise<void> {
    const loc = DataVisualizationPageLocators.versatileSolutionsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickLocalKnowledge(): Promise<void> {
    const loc = DataVisualizationPageLocators.localKnowledgeButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickExcellenceCenter(): Promise<void> {
    const loc = DataVisualizationPageLocators.excellenceCenterButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clickCustomAccelerators(): Promise<void> {
    const loc = DataVisualizationPageLocators.customAcceleratorsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }
}
