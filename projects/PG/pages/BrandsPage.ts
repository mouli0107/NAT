import { Page } from '@playwright/test';
import { BrandsPageLocators } from '../locators/BrandsPage.locators';

export class BrandsPage {
  private page: Page;
  private readonly url = 'https://us.pg.com/brands/';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async isPageLoaded(): Promise<boolean> {
    const heading = BrandsPageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    return await heading.isVisible();
  }

  async clickSkipToMainContent(): Promise<void> {
    const link = BrandsPageLocators.skipToMainContentLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async navigateToHome(): Promise<void> {
    const link = BrandsPageLocators.pgHomepageLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickLocationSelector(): Promise<void> {
    const link = BrandsPageLocators.locationLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickWhoWeAre(): Promise<void> {
    const link = BrandsPageLocators.whoWeAreLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickInnovation(): Promise<void> {
    const link = BrandsPageLocators.innovationLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickProductSafety(): Promise<void> {
    const link = BrandsPageLocators.productSafetyLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickIngredients(): Promise<void> {
    const link = BrandsPageLocators.ingredientsLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickFragranceIngredients(): Promise<void> {
    const link = BrandsPageLocators.fragranceIngredientsLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickCrueltyFree(): Promise<void> {
    const link = BrandsPageLocators.crueltryFreeLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickCommunityImpact(): Promise<void> {
    const link = BrandsPageLocators.communityImpactLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickEqualityInclusion(): Promise<void> {
    const link = BrandsPageLocators.equalityInclusionLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickSustainability(): Promise<void> {
    const link = BrandsPageLocators.sustainabilityLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickEthicsResponsibility(): Promise<void> {
    const link = BrandsPageLocators.ethicsResponsibilityLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickPGHistory(): Promise<void> {
    const link = BrandsPageLocators.pgHistoryLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickAnnualReport(): Promise<void> {
    const link = BrandsPageLocators.annualReportLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickCitizenshipReport(): Promise<void> {
    const link = BrandsPageLocators.citizenshipReportLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickBlog(): Promise<void> {
    const link = BrandsPageLocators.blogLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickNewsroom(): Promise<void> {
    const link = BrandsPageLocators.newsroomLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async clickRewardsOffers(): Promise<void> {
    const link = BrandsPageLocators.rewardsOffersLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async searchInHeader(query: string): Promise<void> {
    const searchBox = BrandsPageLocators.headerSearchBox(this.page);
    await searchBox.waitFor({ state: 'visible' });
    await searchBox.fill(query);
    await searchBox.press('Enter');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async searchBrands(query: string): Promise<void> {
    const searchBox = BrandsPageLocators.filterSearchBox(this.page);
    await searchBox.waitFor({ state: 'visible' });
    await searchBox.fill(query);
  }

  async filterByBabyCare(): Promise<void> {
    const checkbox = BrandsPageLocators.babyCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByCommercialCare(): Promise<void> {
    const checkbox = BrandsPageLocators.commercialCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByFabricCare(): Promise<void> {
    const checkbox = BrandsPageLocators.fabricCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByFamilyCare(): Promise<void> {
    const checkbox = BrandsPageLocators.familyCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByFeminineCare(): Promise<void> {
    const checkbox = BrandsPageLocators.feminineCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByGrooming(): Promise<void> {
    const checkbox = BrandsPageLocators.groomingCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByHairCare(): Promise<void> {
    const checkbox = BrandsPageLocators.hairCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByHomeCare(): Promise<void> {
    const checkbox = BrandsPageLocators.homeCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByMultiBrandPrograms(): Promise<void> {
    const checkbox = BrandsPageLocators.multiBrandProgramsCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByOralCare(): Promise<void> {
    const checkbox = BrandsPageLocators.oralCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterByPersonalHealthCare(): Promise<void> {
    const checkbox = BrandsPageLocators.personalHealthCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async filterBySkinPersonalCare(): Promise<void> {
    const checkbox = BrandsPageLocators.skinPersonalCareCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
  }

  async clearFilters(): Promise<void> {
    const button = BrandsPageLocators.clearFilterButton(this.page);
    await button.waitFor({ state: 'visible' });
    await button.click();
  }

  async isBabyCareVisible(): Promise<boolean> {
    const heading = BrandsPageLocators.babyCareHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    return await heading.isVisible();
  }

  async isCommercialCareVisible(): Promise<boolean> {
    const heading = BrandsPageLocators.commercialCareHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    return await heading.isVisible();
  }

  async isFabricCareVisible(): Promise<boolean> {
    const heading = BrandsPageLocators.fabricCareHeading(this.page);
    await heading.waitFor({ state: 'visible' });
    return await heading.isVisible();
  }

  async visitLuvsSite(): Promise<void> {
    const link = BrandsPageLocators.luvsVisitSiteLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async visitNinjamasSite(): Promise<void> {
    const link = BrandsPageLocators.ninjamasVisitSiteLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async visitPampersSite(): Promise<void> {
    const link = BrandsPageLocators.pampersVisitSiteLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async visitPGProSite(): Promise<void> {
    const link = BrandsPageLocators.pgProVisitSiteLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async visitArielSite(): Promise<void> {
    const link = BrandsPageLocators.arielVisitSiteLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async visitBounceSite(): Promise<void> {
    const link = BrandsPageLocators.bounceVisitSiteLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }
}