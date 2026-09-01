import { Page, Locator } from '@playwright/test';

export const HiltiHomePageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),'Agree')]
  agreeCookiesButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Agree") and contains(normalize-space(text()),"data processing")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[@href="/products"]
  productsNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[normalize-space(text())="Products"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"Power tools")]
  powerToolsLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Power tools")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),"COUNTRY")]
  changeCountryButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"CHANGE COUNTRY")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[@href="/engineering"]
  engineeringCentreLink: (page: Page): Locator => page.locator('xpath=//nav//a[normalize-space(text())="Engineering Center"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(text(),"Business")]
  businessOptimizationButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Business Optimization")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"Control Costs")]
  controlCostsLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Control Costs")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"Health")]
  healthAndSafetyLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Health and safety")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"exoskeletons")]
  constructionExoskeletonsLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Construction exoskeletons")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"EXO-S")]
  exoSShoulderLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"EXO-S Shoulder Exoskeleton")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[text()="ADD TO CART"]
  addToCartButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"ADD TO CART")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@aria-label="Search"]
  searchInput: (page: Page): Locator => page.locator('xpath=//input[@aria-label="Search" or @placeholder="Search"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(@aria-label,"Search")]
  searchButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Search Field") or @aria-label="Search"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"/cart")]
  cartLink: (page: Page): Locator => page.locator('xpath=//nav//a[normalize-space(text())="Cart"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[@href="/"]//img
  hiltiLogo: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="Home"]//img[@alt="HILTI logo"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[@href="#nav/solutions"]
  solutionsNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[normalize-space(text())="Solutions"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[contains(text(),"Support")]
  supportNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Support and Downloads")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[@href="#nav/company"]
  companyNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[normalize-space(text())="Company"]'),
  
  // Uniqueness: unique | Stability: fragile - promotional | Fallback: //main//h1[1]
  mainHeading: (page: Page): Locator => page.locator('xpath=//main//h1[1]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"/shop/promotions")]
  currentPromotionsLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Start saving") and contains(@href,"promotions")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[text()="Quick Item Number Entry"]
  quickItemEntryButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Quick Item Number Entry")]')
  agreeButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),
  productsButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),
  solutionsButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),
  commercialPipingLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
  closeButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),
  engineeringCenterLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
  askLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
  learnLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
  articlesLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
  homeLogoLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  supportDownloadsButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),
  companyButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),
  shopNowLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
  startSavingLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),
};
