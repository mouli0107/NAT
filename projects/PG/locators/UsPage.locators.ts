import { Page, Locator } from '@playwright/test';

/**
 * UsPage Object Repository — us.pg.com
 * Strategy: XPath-first, scoped to stable structural anchors
 * All nav links scoped to #global-navigation-header to avoid footer duplicates
 */
export const UsPageLocators = {

  /** Skip to main content link (accessibility) */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='#page-content']
  skipToMainContentLink: (page: Page): Locator =>
    page.locator("xpath=//a[normalize-space(text())='Skip to main content']"),

  /** P&G homepage logo link */
  // Uniqueness: unique | Stability: stable | Fallback: //header//a[@href='/']
  homepageLink: (page: Page): Locator =>
    page.locator("xpath=//a[@href='/' and .//img[contains(@alt,'Procter')]]"),

  /** Location selector link (USA) */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'/locations/')]
  locationLink: (page: Page): Locator =>
    page.locator("xpath=//a[contains(normalize-space(text()),'USA') and contains(@href,'/locations/')]"),

  /** Main navigation container — stable structural anchor for all nav items */
  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label='Main Navigation']
  mainNavigation: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']"),

  /** Our Brands menu trigger */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Our Brands']
  ourBrandsMenu: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//*[normalize-space(text())='Our Brands']"),

  /** Brands link — scoped to nav to avoid footer */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='/brands/' and not(ancestor::footer)]
  brandsLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Brands' and contains(@href,'/brands/')]"),

  /** Innovation link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='/innovation/']
  innovationLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Innovation']"),

  /** Product Safety link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'product-safety')]
  productSafetyLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Product Safety']"),

  /** Ingredients link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'ingredients')]
  ingredientsLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Ingredients']"),

  /** Fragrance Ingredients link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'fragrance')]
  fragranceIngredientsLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Fragrance Ingredients']"),

  /** #BECRUELTYFREE link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'cruelty')]
  crueltyFreeLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[contains(normalize-space(text()),'CRUELTYFREE')]"),

  /** Our Impact menu trigger */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Our Impact']
  ourImpactMenu: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//*[normalize-space(text())='Our Impact']"),

  /** Community Impact link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='/community-impact/']
  communityImpactLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Community Impact']"),

  /** Equality & Inclusion link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'equality')]
  equalityInclusionLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Equality & Inclusion']"),

  /** Sustainability link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='/environmental-sustainability/']
  sustainabilityLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Sustainability']"),

  /** Ethics & Responsibility link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'ethics')]
  ethicsResponsibilityLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Ethics & Responsibility']"),

  /** Our Story menu trigger */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='Our Story']
  ourStoryMenu: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//*[normalize-space(text())='Our Story']"),

  /** Who We Are link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='/who-we-are/']
  whoWeAreLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Who We Are']"),

  /** P&G History link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'history')]
  historyLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())=\"P&G History\"]"),

  /** Annual Report link — scoped to nav */
  // Uniqueness: unique | Stability: fragile — year in link text changes annually | Fallback: //a[contains(@href,'annual-report')]
  annualReportLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[contains(@href,'annual-report')]"),

  /** Citizenship Report link — scoped to nav */
  // Uniqueness: unique | Stability: fragile — year in link text changes annually | Fallback: //a[contains(@href,'citizenship')]
  citizenshipReportLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[contains(@href,'citizenship')]"),

  /** News menu trigger */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[text()='News']
  newsMenu: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//*[normalize-space(text())='News']"),

  /** Blog link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[@href='/blogs/']
  blogLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Blog' and contains(@href,'/blogs/')]"),

  /** Newsroom link — scoped to nav */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'newsroom')]
  newsroomLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Newsroom']"),

  /**
   * Rewards & Offers link — scoped to nav header
   * FIXED: was //a[normalize-space(text())='Rewards & Offers'] which matched footer too
   */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'pgbrandsaver.com')]
  rewardsOffersLink: (page: Page): Locator =>
    page.locator("xpath=//*[@id='global-navigation-header']//a[normalize-space(text())='Rewards & Offers']"),

  /** Search input box */
  // Uniqueness: unique | Stability: stable | Fallback: //*[@role='searchbox']
  searchInput: (page: Page): Locator =>
    page.locator("xpath=//input[@placeholder='Search here']"),

  /** Pause Animation button on homepage carousel */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@aria-label='Pause Animation']
  pauseAnimationButton: (page: Page): Locator =>
    page.locator("xpath=//button[normalize-space(text())='Pause Animation']"),

  /** Read more awards link */
  // Uniqueness: unique | Stability: fragile — promotional content changes | Fallback: //a[contains(@href,'awards')]
  awardsReadMoreLink: (page: Page): Locator =>
    page.locator("xpath=//a[contains(@href,'awards-and-recognitions') or contains(@href,'pg-awards')]"),

  /** Previous carousel button */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@aria-label='Previous']
  previousButton: (page: Page): Locator =>
    page.locator("xpath=//button[@aria-label='previous' or normalize-space(text())='previous']"),

  /** Next carousel button */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@aria-label='Next']
  nextButton: (page: Page): Locator =>
    page.locator("xpath=//button[@aria-label='next' or normalize-space(text())='next']"),

  /** See all our latest stories link */
  // Uniqueness: unique | Stability: stable | Fallback: //main//a[@href='/blogs/' and contains(text(),'See all')]
  seeAllStoriesLink: (page: Page): Locator =>
    page.locator("xpath=//a[normalize-space(.)='See all our latest stories']"),

  /** Homepage main heading — structural anchor, NOT content-based (content changes with campaigns) */
  // Uniqueness: unique | Stability: stable | Fallback: //main//h1
  mainHeading: (page: Page): Locator =>
    page.locator("xpath=//main//h1[1]"),

};
