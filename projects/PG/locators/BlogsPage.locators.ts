import { Page, Locator } from '@playwright/test';

export const BlogsPageLocators = {
  /** Skip to main content navigation link */
  skipToMainContentLink: (page: Page): Locator => page.getByRole('link', { name: 'Skip to main content' }),
  
  /** P&G homepage link in header */
  homepageLink: (page: Page): Locator => page.getByRole('link', { name: 'Go to Procter & Gamble homepage' }),
  
  /** Location selector link (USA) */
  locationSelectorLink: (page: Page): Locator => page.getByRole('link', { name: 'USA, Change Location' }),
  
  /** Main page heading "The P&G Blog." */
  pageHeading: (page: Page): Locator => page.getByRole('heading', { name: 'The P&G Blog.', level: 1 }),
  
  /** Search input box in header */
  searchInput: (page: Page): Locator => page.getByRole('searchbox', { name: 'Search here' }),
  
  /** Community Impact filter checkbox */
  communityImpactCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Community Impact' }),
  
  /** Ethics & Responsibility filter checkbox */
  ethicsResponsibilityCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Ethics & Responsibility' }),
  
  /** Ingredients & Safety filter checkbox */
  ingredientsSafetyCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Ingredients & Safety' }),
  
  /** Environmental Sustainability filter checkbox */
  environmentalSustainabilityCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Environmental Sustainability' }),
  
  /** Climate sub-filter checkbox under Environmental Sustainability */
  climateCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Climate' }),
  
  /** Water sub-filter checkbox under Environmental Sustainability */
  waterCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Water' }),
  
  /** Waste sub-filter checkbox under Environmental Sustainability */
  wasteCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Waste' }),
  
  /** Nature sub-filter checkbox under Environmental Sustainability */
  natureCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Nature' }),
  
  /** Equality & Inclusion filter checkbox */
  equalityInclusionCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Equality & Inclusion' }),
  
  /** Gender sub-filter checkbox under Equality & Inclusion */
  genderCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Gender' }),
  
  /** LGBTQ+ sub-filter checkbox under Equality & Inclusion */
  lgbtqCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'LGBTQ+' }),
  
  /** People with Disabilities sub-filter checkbox under Equality & Inclusion */
  disabilitiesCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'People with Disabilities' }),
  
  /** Race & Ethnicity sub-filter checkbox under Equality & Inclusion */
  raceEthnicityCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Race & Ethnicity' }),
  
  /** Workplace filter checkbox */
  workplaceCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Workplace' }),
  
  /** P&G People sub-filter checkbox under Workplace */
  pgPeopleCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'P&G People' }),
  
  /** Brand News filter checkbox */
  brandNewsCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Brand News' }),
  
  /** P&G Studios sub-filter checkbox under Brand News */
  pgStudiosCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'P&G Studios' }),
  
  /** Innovation filter checkbox */
  innovationCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Innovation' }),
  
  /** Constructive Disruption sub-filter checkbox under Innovation */
  constructiveDisruptionCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Constructive Disruption' }),
  
  /** Myth-Busting Series sub-filter checkbox under Innovation */
  mythBustingCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Myth-Busting Series' }),
  
  /** P&G Ventures sub-filter checkbox under Innovation */
  pgVenturesCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'P&G Ventures' }),
  
  /** Company News filter checkbox */
  companyNewsCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Company News' }),
  
  /** Business Strategy sub-filter checkbox under Company News */
  businessStrategyCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Business Strategy' }),
  
  /** Annual Report & Earnings sub-filter checkbox under Company News */
  annualReportEarningsCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Annual Report & Earnings' }),
  
  /** Business News sub-filter checkbox under Company News */
  businessNewsCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Business News' }),
  
  /** Clear all filters button */
  clearAllButton: (page: Page): Locator => page.getByRole('button', { name: 'Clear all' }),
  
  /** First blog post link - Brands and Beyond article */
  firstBlogPostLink: (page: Page): Locator => page.getByRole('link', { name: /Brands and Beyond: How P&G Is Making an Impact in the Communities We Serve/ }),
};