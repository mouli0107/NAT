import { Page } from '@playwright/test';
import { CommunityImpactPageLocators } from '@locators/CommunityImpactPage.locators';

export class CommunityImpactPage {
  constructor(private page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('https://us.pg.com/community-impact/');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickLocalPrograms(): Promise<void> {
    const locator = CommunityImpactPageLocators.localProgramsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickBrandPrograms(): Promise<void> {
    const locator = CommunityImpactPageLocators.brandProgramsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickGlobalPrograms(): Promise<void> {
    const locator = CommunityImpactPageLocators.globalProgramsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickViewAllBlogs(): Promise<void> {
    const locator = CommunityImpactPageLocators.viewAllBlogsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickJumpToBrandPrograms(): Promise<void> {
    const locator = CommunityImpactPageLocators.jumpToBrandProgramsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickJumpToGlobalPrograms(): Promise<void> {
    const locator = CommunityImpactPageLocators.jumpToGlobalProgramsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickJumpToLocalPrograms(): Promise<void> {
    const locator = CommunityImpactPageLocators.jumpToLocalProgramsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async isPageLoaded(): Promise<boolean> {
    const locator = CommunityImpactPageLocators.pageHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async waitForPageLoad(): Promise<void> {
    const locator = CommunityImpactPageLocators.pageHeading(this.page);
    await locator.waitFor({ state: 'visible' });
  }

  async isBrandsImpactSectionVisible(): Promise<boolean> {
    const locator = CommunityImpactPageLocators.brandsImpactHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isTakingActionSectionVisible(): Promise<boolean> {
    const locator = CommunityImpactPageLocators.takingActionHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }
}