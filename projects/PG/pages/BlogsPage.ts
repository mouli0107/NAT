import { Page } from '@playwright/test';
import { BlogsPageLocators } from '../locators/BlogsPage.locators';

export class BlogsPage {
  constructor(private page: Page) {}

  async goto(filter?: string): Promise<void> {
    const url = filter 
      ? `https://us.pg.com/blogs/#filter=${filter}` 
      : 'https://us.pg.com/blogs/';
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    const heading = BlogsPageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible' });
  }

  async searchBlogs(query: string): Promise<void> {
    const searchInput = BlogsPageLocators.searchInput(this.page);
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(query);
    await searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByCommunityImpact(): Promise<void> {
    const checkbox = BlogsPageLocators.communityImpactCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByEthicsResponsibility(): Promise<void> {
    const checkbox = BlogsPageLocators.ethicsResponsibilityCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByIngredientsSafety(): Promise<void> {
    const checkbox = BlogsPageLocators.ingredientsSafetyCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByEnvironmentalSustainability(): Promise<void> {
    const checkbox = BlogsPageLocators.environmentalSustainabilityCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByClimate(): Promise<void> {
    const checkbox = BlogsPageLocators.climateCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByWater(): Promise<void> {
    const checkbox = BlogsPageLocators.waterCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByWaste(): Promise<void> {
    const checkbox = BlogsPageLocators.wasteCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByNature(): Promise<void> {
    const checkbox = BlogsPageLocators.natureCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByEqualityInclusion(): Promise<void> {
    const checkbox = BlogsPageLocators.equalityInclusionCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByGender(): Promise<void> {
    const checkbox = BlogsPageLocators.genderCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByLGBTQ(): Promise<void> {
    const checkbox = BlogsPageLocators.lgbtqCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByDisabilities(): Promise<void> {
    const checkbox = BlogsPageLocators.disabilitiesCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByRaceEthnicity(): Promise<void> {
    const checkbox = BlogsPageLocators.raceEthnicityCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByWorkplace(): Promise<void> {
    const checkbox = BlogsPageLocators.workplaceCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByPGPeople(): Promise<void> {
    const checkbox = BlogsPageLocators.pgPeopleCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByBrandNews(): Promise<void> {
    const checkbox = BlogsPageLocators.brandNewsCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByPGStudios(): Promise<void> {
    const checkbox = BlogsPageLocators.pgStudiosCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByInnovation(): Promise<void> {
    const checkbox = BlogsPageLocators.innovationCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByConstructiveDisruption(): Promise<void> {
    const checkbox = BlogsPageLocators.constructiveDisruptionCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByMythBusting(): Promise<void> {
    const checkbox = BlogsPageLocators.mythBustingCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByPGVentures(): Promise<void> {
    const checkbox = BlogsPageLocators.pgVenturesCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByCompanyNews(): Promise<void> {
    const checkbox = BlogsPageLocators.companyNewsCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByBusinessStrategy(): Promise<void> {
    const checkbox = BlogsPageLocators.businessStrategyCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByAnnualReportEarnings(): Promise<void> {
    const checkbox = BlogsPageLocators.annualReportEarningsCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async filterByBusinessNews(): Promise<void> {
    const checkbox = BlogsPageLocators.businessNewsCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.check();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clearAllFilters(): Promise<void> {
    const button = BlogsPageLocators.clearAllButton(this.page);
    await button.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      button.click()
    ]);
  }

  async clickFirstBlogPost(): Promise<void> {
    const link = BlogsPageLocators.firstBlogPostLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async isFilterChecked(filterLocatorName: string): Promise<boolean> {
    const locatorMap: Record<string, (page: Page) => Locator> = {
      'communityImpact': BlogsPageLocators.communityImpactCheckbox,
      'ethicsResponsibility': BlogsPageLocators.ethicsResponsibilityCheckbox,
      'ingredientsSafety': BlogsPageLocators.ingredientsSafetyCheckbox,
      'environmentalSustainability': BlogsPageLocators.environmentalSustainabilityCheckbox,
      'climate': BlogsPageLocators.climateCheckbox,
      'water': BlogsPageLocators.waterCheckbox,
      'waste': BlogsPageLocators.wasteCheckbox,
      'nature': BlogsPageLocators.natureCheckbox,
      'equalityInclusion': BlogsPageLocators.equalityInclusionCheckbox,
      'gender': BlogsPageLocators.genderCheckbox,
      'lgbtq': BlogsPageLocators.lgbtqCheckbox,
      'disabilities': BlogsPageLocators.disabilitiesCheckbox,
      'raceEthnicity': BlogsPageLocators.raceEthnicityCheckbox,
      'workplace': BlogsPageLocators.workplaceCheckbox,
      'pgPeople': BlogsPageLocators.pgPeopleCheckbox,
      'brandNews': BlogsPageLocators.brandNewsCheckbox,
      'pgStudios': BlogsPageLocators.pgStudiosCheckbox,
      'innovation': BlogsPageLocators.innovationCheckbox,
      'constructiveDisruption': BlogsPageLocators.constructiveDisruptionCheckbox,
      'mythBusting': BlogsPageLocators.mythBustingCheckbox,
      'pgVentures': BlogsPageLocators.pgVenturesCheckbox,
      'companyNews': BlogsPageLocators.companyNewsCheckbox,
      'businessStrategy': BlogsPageLocators.businessStrategyCheckbox,
      'annualReportEarnings': BlogsPageLocators.annualReportEarningsCheckbox,
      'businessNews': BlogsPageLocators.businessNewsCheckbox,
    };
    
    const locatorFunc = locatorMap[filterLocatorName];
    if (!locatorFunc) {
      throw new Error(`Unknown filter: ${filterLocatorName}`);
    }
    
    const checkbox = locatorFunc(this.page);
    await checkbox.waitFor({ state: 'visible' });
    return await checkbox.isChecked();
  }

  async skipToMainContent(): Promise<void> {
    const link = BlogsPageLocators.skipToMainContentLink(this.page);
    await link.waitFor({ state: 'visible' });
    await link.click();
  }

  async navigateToHomepage(): Promise<void> {
    const link = BlogsPageLocators.homepageLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }

  async openLocationSelector(): Promise<void> {
    const link = BlogsPageLocators.locationSelectorLink(this.page);
    await link.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      link.click()
    ]);
  }
}