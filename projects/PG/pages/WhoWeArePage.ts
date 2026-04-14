import { Page } from '@playwright/test';
import { WhoWeArePageLocators } from '../locators/WhoWeArePage.locators';

export class WhoWeArePage {
  private page: Page;
  private readonly url = 'https://us.pg.com/who-we-are/';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the Who We Are page
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    const mainHeading = WhoWeArePageLocators.mainHeading(this.page);
    await mainHeading.waitFor({ state: 'visible' });
  }

  /**
   * Click the "See our impact" link to navigate to community impact page
   */
  async clickSeeOurImpact(): Promise<void> {
    const link = WhoWeArePageLocators.seeOurImpactLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  /**
   * Click the "See our brands" link to navigate to brands page
   */
  async clickSeeOurBrands(): Promise<void> {
    const link = WhoWeArePageLocators.seeOurBrandsLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  /**
   * Get the text of the main heading
   */
  async getMainHeadingText(): Promise<string> {
    const heading = WhoWeArePageLocators.mainHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    return await heading.textContent() || '';
  }

  /**
   * Toggle the video playback
   */
  async toggleVideo(): Promise<void> {
    const button = WhoWeArePageLocators.toggleVideoButton(this.page);
    await button.waitFor({ state: 'visible' });
    await button.click();
  }

  /**
   * Click the "purpose, values, and principles" link
   */
  async clickPurposeValues(): Promise<void> {
    const link = WhoWeArePageLocators.purposeValuesLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  /**
   * Click the Total Rewards package link
   */
  async clickTotalRewards(): Promise<void> {
    const link = WhoWeArePageLocators.totalRewardsLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  /**
   * Navigate to the next employee story in the carousel
   */
  async clickNextStory(): Promise<void> {
    const button = WhoWeArePageLocators.nextButton(this.page);
    await button.waitFor({ state: 'visible' });
    await button.click();
  }

  /**
   * Navigate to the previous employee story in the carousel
   */
  async clickPreviousStory(): Promise<void> {
    const button = WhoWeArePageLocators.previousButton(this.page);
    await button.waitFor({ state: 'visible' });
    await button.click();
  }

  /**
   * Click the Archie Riva video link
   */
  async clickArchieRivaVideo(): Promise<void> {
    const link = WhoWeArePageLocators.archieRivaVideoLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  /**
   * Click the Careers link
   */
  async clickCareers(): Promise<void> {
    const link = WhoWeArePageLocators.careersLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  /**
   * Skip to main content using accessibility link
   */
  async skipToMainContent(): Promise<void> {
    const link = WhoWeArePageLocators.skipToMainContentLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  /**
   * Verify the main heading is visible
   */
  async isMainHeadingVisible(): Promise<boolean> {
    const heading = WhoWeArePageLocators.mainHeading(this.page);
    return await heading.isVisible();
  }

  /**
   * Verify the improving lives heading is visible
   */
  async isImprovingLivesHeadingVisible(): Promise<boolean> {
    const heading = WhoWeArePageLocators.improvingLivesHeading(this.page);
    return await heading.isVisible();
  }

  /**
   * Verify the employee stories heading is visible
   */
  async isEmployeeStoriesHeadingVisible(): Promise<boolean> {
    const heading = WhoWeArePageLocators.employeeStoriesHeading(this.page);
    return await heading.isVisible();
  }
}