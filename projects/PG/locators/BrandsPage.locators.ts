import { Page, Locator } from '@playwright/test';

export const BrandsPageLocators = {
  /** Skip to main content link */
  skipToMainContentLink: (page: Page): Locator => page.getByRole('link', { name: 'Skip to main content' }),
  
  /** Procter & Gamble homepage link */
  pgHomepageLink: (page: Page): Locator => page.getByRole('link', { name: 'Go to Procter & Gamble homepage' }),
  
  /** Location selector link (USA, Change Location) */
  locationLink: (page: Page): Locator => page.getByRole('link', { name: 'USA, Change Location' }),
  
  /** Brands navigation link */
  brandsNavLink: (page: Page): Locator => page.getByRole('link', { name: 'Brands', exact: true }),
  
  /** Innovation navigation link */
  innovationLink: (page: Page): Locator => page.getByRole('link', { name: 'Innovation' }),
  
  /** Product Safety navigation link */
  productSafetyLink: (page: Page): Locator => page.getByRole('link', { name: 'Product Safety' }),
  
  /** Ingredients navigation link */
  ingredientsLink: (page: Page): Locator => page.getByRole('link', { name: 'Ingredients', exact: true }),
  
  /** Fragrance Ingredients navigation link */
  fragranceIngredientsLink: (page: Page): Locator => page.getByRole('link', { name: 'Fragrance Ingredients' }),
  
  /** #BECRUELTYFREE navigation link */
  crueltryFreeLink: (page: Page): Locator => page.getByRole('link', { name: '#BECRUELTYFREE' }),
  
  /** Community Impact navigation link */
  communityImpactLink: (page: Page): Locator => page.getByRole('link', { name: 'Community Impact' }),
  
  /** Equality & Inclusion navigation link */
  equalityInclusionLink: (page: Page): Locator => page.getByRole('link', { name: 'Equality & Inclusion' }),
  
  /** Sustainability navigation link */
  sustainabilityLink: (page: Page): Locator => page.getByRole('link', { name: 'Sustainability' }),
  
  /** Ethics & Responsibility navigation link */
  ethicsResponsibilityLink: (page: Page): Locator => page.getByRole('link', { name: 'Ethics & Responsibility' }),
  
  /** Who We Are navigation link */
  whoWeAreLink: (page: Page): Locator => page.getByRole('link', { name: 'Who We Are' }),
  
  /** P&G History navigation link */
  pgHistoryLink: (page: Page): Locator => page.getByRole('link', { name: 'P&G History' }),
  
  /** 2025 Annual Report navigation link */
  annualReportLink: (page: Page): Locator => page.getByRole('link', { name: '2025 Annual Report' }),
  
  /** 2024 Citizenship Report navigation link */
  citizenshipReportLink: (page: Page): Locator => page.getByRole('link', { name: '2024 Citizenship Report' }),
  
  /** Blog navigation link */
  blogLink: (page: Page): Locator => page.getByRole('link', { name: 'Blog' }),
  
  /** Newsroom navigation link */
  newsroomLink: (page: Page): Locator => page.getByRole('link', { name: 'Newsroom' }),
  
  /** Rewards & Offers navigation link */
  rewardsOffersLink: (page: Page): Locator => page.getByRole('link', { name: 'Rewards & Offers' }),
  
  /** Header search box */
  headerSearchBox: (page: Page): Locator => page.getByRole('searchbox', { name: 'Search here' }),
  
  /** Main page heading "Brands." */
  pageHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Brands.', level: 1 }),
  
  /** Filter search textbox */
  filterSearchBox: (page: Page): Locator => page.getByPlaceholder('Search Here'),
  
  /** Baby Care filter checkbox */
  babyCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Baby Care' }),
  
  /** Commercial Care filter checkbox */
  commercialCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Commercial Care' }),
  
  /** Fabric Care filter checkbox */
  fabricCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Fabric Care' }),
  
  /** Family Care filter checkbox */
  familyCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Family Care' }),
  
  /** Feminine Care filter checkbox */
  feminineCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Feminine Care' }),
  
  /** Grooming filter checkbox */
  groomingCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Grooming' }),
  
  /** Hair Care filter checkbox */
  hairCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Hair Care' }),
  
  /** Home Care filter checkbox */
  homeCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Home Care' }),
  
  /** Multi brand Programs filter checkbox */
  multiBrandProgramsCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Multi brand Programs' }),
  
  /** Oral Care filter checkbox */
  oralCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Oral Care' }),
  
  /** Personal Health Care filter checkbox */
  personalHealthCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Personal Health Care' }),
  
  /** Skin & Personal Care filter checkbox */
  skinPersonalCareCheckbox: (page: Page): Locator => page.getByRole('checkbox', { name: 'Filter brands by Skin & Personal Care' }),
  
  /** Clear Filter button */
  clearFilterButton: (page: Page): Locator => page.getByRole('button', { name: 'Clear' }),
  
  /** Baby Care section heading */
  babyCareHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Baby Care', level: 2 }),
  
  /** Commercial Care section heading */
  commercialCareHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Commercial Care', level: 2 }),
  
  /** Fabric Care section heading */
  fabricCareHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Fabric Care', level: 2 }),
  
  /** Luvs brand visit site link */
  luvsVisitSiteLink: (page: Page): Locator => page.getByRole('link', { name: 'Visit site Luvs' }),
  
  /** Ninjamas brand visit site link */
  ninjamasVisitSiteLink: (page: Page): Locator => page.getByRole('link', { name: 'Visit site Ninjamas' }),
  
  /** Pampers brand visit site link */
  pampersVisitSiteLink: (page: Page): Locator => page.getByRole('link', { name: 'Visit site Pampers' }),
  
  /** P&G PRO brand visit site link */
  pgProVisitSiteLink: (page: Page): Locator => page.getByRole('link', { name: 'Visit site P&G PRO' }),
  
  /** Ariel brand visit site link */
  arielVisitSiteLink: (page: Page): Locator => page.getByRole('link', { name: 'Visit site Ariel' }),
  
  /** Bounce brand visit site link */
  bounceVisitSiteLink: (page: Page): Locator => page.getByRole('link', { name: 'Visit site Bounce' }),
};