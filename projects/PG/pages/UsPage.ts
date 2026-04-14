import { Page } from '@playwright/test';
import { UsPageLocators } from '../locators/UsPage.locators';

export class UsPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the US P&G homepage
   * @param url - Optional URL to navigate to (defaults to https://us.pg.com/)
   */
  async navigate(url: string = 'https://us.pg.com/'): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    const mainNav = UsPageLocators.mainNavigation(this.page);
    await mainNav.waitFor({ state: 'visible' });
  }

  /**
   * Click the "Skip to main content" link
   */
  async clickSkipToMainContent(): Promise<void> {
    const locator = UsPageLocators.skipToMainContentLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the P&G homepage logo link
   */
  async clickHomepageLink(): Promise<void> {
    const locator = UsPageLocators.homepageLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the location selector link
   */
  async clickLocationSelector(): Promise<void> {
    const locator = UsPageLocators.locationLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click or hover over the "Our Brands" menu item to reveal submenu
   */
  async clickOurBrands(): Promise<void> {
    const locator = UsPageLocators.ourBrandsText(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Hover over the "Our Brands" menu item to reveal submenu
   */
  async hoverOverOurBrands(): Promise<void> {
    const locator = UsPageLocators.ourBrandsText(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.hover();
  }

  /**
   * Click the "Brands" link under Our Brands menu
   */
  async clickBrandsLink(): Promise<void> {
    const locator = UsPageLocators.brandsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Innovation" link under Our Brands menu
   */
  async clickInnovationLink(): Promise<void> {
    const locator = UsPageLocators.innovationLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Product Safety" link under Our Brands menu
   */
  async clickProductSafetyLink(): Promise<void> {
    const locator = UsPageLocators.productSafetyLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Ingredients" link under Our Brands menu
   */
  async clickIngredientsLink(): Promise<void> {
    const locator = UsPageLocators.ingredientsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Fragrance Ingredients" link under Our Brands menu
   */
  async clickFragranceIngredientsLink(): Promise<void> {
    const locator = UsPageLocators.fragranceIngredientsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "#BECRUELTYFREE" link under Our Brands menu
   */
  async clickCrueltyFreeLink(): Promise<void> {
    const locator = UsPageLocators.crueltyFreeLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click or hover over the "Our Impact" menu item to reveal submenu
   */
  async clickOurImpact(): Promise<void> {
    const locator = UsPageLocators.ourImpactText(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the "Community Impact" link under Our Impact menu
   */
  async clickCommunityImpactLink(): Promise<void> {
    const locator = UsPageLocators.communityImpactLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Equality & Inclusion" link under Our Impact menu
   */
  async clickEqualityInclusionLink(): Promise<void> {
    const locator = UsPageLocators.equalityInclusionLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Sustainability" link under Our Impact menu
   */
  async clickSustainabilityLink(): Promise<void> {
    const locator = UsPageLocators.sustainabilityLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Ethics & Responsibility" link under Our Impact menu
   */
  async clickEthicsResponsibilityLink(): Promise<void> {
    const locator = UsPageLocators.ethicsResponsibilityLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click or hover over the "Our Story" menu item to reveal submenu
   */
  async clickOurStory(): Promise<void> {
    const locator = UsPageLocators.ourStoryText(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the "Who We Are" link under Our Story menu
   */
  async clickWhoWeAreLink(): Promise<void> {
    const locator = UsPageLocators.whoWeAreLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "P&G History" link under Our Story menu
   */
  async clickHistoryLink(): Promise<void> {
    const locator = UsPageLocators.historyLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "2025 Annual Report" link under Our Story menu
   */
  async clickAnnualReportLink(): Promise<void> {
    const locator = UsPageLocators.annualReportLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "2024 Citizenship Report" link under Our Story menu
   */
  async clickCitizenshipReportLink(): Promise<void> {
    const locator = UsPageLocators.citizenshipReportLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click or hover over the "News" menu item to reveal submenu
   */
  async clickNews(): Promise<void> {
    const locator = UsPageLocators.newsText(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the "Blog" link under News menu
   */
  async clickBlogLink(): Promise<void> {
    const locator = UsPageLocators.blogLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Newsroom" link under News menu
   */
  async clickNewsroomLink(): Promise<void> {
    const locator = UsPageLocators.newsroomLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the "Rewards & Offers" link
   */
  async clickRewardsOffersLink(): Promise<void> {
    const locator = UsPageLocators.rewardsOffersLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Perform a search using the search input
   * @param query - The search query string
   */
  async search(query: string): Promise<void> {
    const locator = UsPageLocators.searchInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.fill(query);
    await locator.press('Enter');
  }

  /**
   * Click the Pause Animation button
   */
  async clickPauseAnimation(): Promise<void> {
    const locator = UsPageLocators.pauseAnimationButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the "Read more about P&G awards and recognitions" link
   */
  async clickPlatinumEmployerReadMore(): Promise<void> {
    const locator = UsPageLocators.platinumEmployerReadMoreLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  /**
   * Click the Previous button in carousel
   */
  async clickPreviousButton(): Promise<void> {
    const locator = UsPageLocators.previousButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the Next button in carousel
   */
  async clickNextButton(): Promise<void> {
    const locator = UsPageLocators.nextButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  /**
   * Click the "See all our latest stories" link
   */
  async clickSeeAllStoriesLink(): Promise<void> {
    const locator = UsPageLocators.seeAllStoriesLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }
}