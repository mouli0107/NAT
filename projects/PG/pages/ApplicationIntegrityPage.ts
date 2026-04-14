import { Page } from '@playwright/test';
import { ApplicationIntegrityPageLocators } from '../locators/ApplicationIntegrityPage.locators';

export class ApplicationIntegrityPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto('https://smartbear.com/application-integrity/');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickStoreLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.storeLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickSupportLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.supportLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickLoginLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.loginLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickHomeLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.homeLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickSearchLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.searchLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickGetStartedLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.getStartedLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickAIButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.aiButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickProductsButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.productsButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickResourcesButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.resourcesButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickWhySmartBearButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.whySmartBearButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async getMainHeadingText(): Promise<string> {
    const locator = ApplicationIntegrityPageLocators.mainHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async isMainHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.mainHeadingStructural(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async clickExploreProductsLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.exploreProductsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickApplicationIntegrityButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.applicationIntegrityButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async isForcesReshapingHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.forcesReshapingHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isHowYouBuildHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.howYouBuildHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isWhoUsesHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.whoUsesHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isVolumeVelocityHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.volumeVelocityHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isCantSeeAIHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.cantSeeAIHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async scrollToWhatIsAppIntegritySection(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.whatIsAppIntegrityHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
  }

  async clickReadMoreLink(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.readMoreLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async scrollToAIJourneySection(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.aiJourneyHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
  }

  async scrollToLevelsOfAutonomySection(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.levelsOfAutonomyHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
  }

  async clickLevel1ConnectedButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level1ConnectedButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel2OnDemandButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level2OnDemandButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel3ResponsiveButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level3ResponsiveButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel4DirectedButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level4DirectedButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel5AuthorizedButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level5AuthorizedButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel1NavigationButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level1NavigationButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel2NavigationButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level2NavigationButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel3NavigationButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level3NavigationButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel4NavigationButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level4NavigationButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickLevel5NavigationButton(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.level5NavigationButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async isHumansBuildHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.humansBuildHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async scrollToSmartBearBringsSection(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.smartBearBringsHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
  }

  async isCloudHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.cloudHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isOnPremisesHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.onPremisesHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async isMobileHeadingVisible(): Promise<boolean> {
    const locator = ApplicationIntegrityPageLocators.mobileHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.isVisible();
  }

  async scrollToAppIntegrityAtWorkSection(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.appIntegrityAtWorkHeading(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.scrollIntoViewIfNeeded();
  }

  async clickExploreProductsLinkBottom(): Promise<void> {
    const locator = ApplicationIntegrityPageLocators.exploreProductsLinkBottom(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async verifyPageLoaded(): Promise<boolean> {
    try {
      const locator = ApplicationIntegrityPageLocators.mainHeadingStructural(this.page);
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}