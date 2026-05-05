import { Page, Locator } from '@playwright/test';

export const CaseStudyPageLocators = {
  // Uniqueness: verify - scoped to main header to avoid footer duplicates | Stability: stable | Fallback: //nav[@aria-label='Main header call to action buttonsw']//a[contains(@href, '/products/request-a-demo')]
  requestDemoLink: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Main header call to action buttonsw']//a[normalize-space(text())='Request demo']"),
  
  // Uniqueness: likely unique | Stability: fragile - campaign content may change | Fallback: //banner//h2[1]
  pageHeading: (page: Page): Locator => page.locator("xpath=//h2[normalize-space(text())='Transforming Customer Experience Through Security']"),
  
  // Uniqueness: verify - multiple headings level 3 exist | Stability: stable | Fallback: //banner//h3[contains(text(), 'CASE STUDY')]
  caseStudyLabel: (page: Page): Locator => page.locator("xpath=//h3[normalize-space(text())='CASE STUDY']"),
  
  // Uniqueness: likely unique | Stability: stable | Fallback: //img[contains(@alt, 'Raiffeisen')]
  raiffeisenLogo: (page: Page): Locator => page.locator("xpath=//img[@alt='Raiffeisen Italy Logo']"),
  
  // Uniqueness: likely unique | Stability: stable | Fallback: //article//h4[1]
  executiveSummaryHeading: (page: Page): Locator => page.locator("xpath=//h4[normalize-space(text())='Executive Summary']"),
  
  // Uniqueness: verify - scoped to top navigation | Stability: stable | Fallback: //nav[@aria-label='Top header navigation']//a[contains(@href, '/search')]
  searchLink: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Top header navigation']//a[normalize-space(text())='Search']"),
  
  // Uniqueness: verify - scoped to main header | Stability: stable | Fallback: //nav[@aria-label='Main Header Navigation']//button[1]
  productsMenuButton: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Main Header Navigation']//button[normalize-space(text())='Products']"),
  
  // Uniqueness: verify - scoped to main header | Stability: stable | Fallback: //nav[@aria-label='Main Header Navigation']//button[contains(text(), 'Resources')]
  resourcesMenuButton: (page: Page): Locator => page.locator("xpath=//nav[@aria-label='Main Header Navigation']//button[normalize-space(text())='Resources']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //region[@aria-label='Mobile header']//a[contains(@href, '/')]
  onespanLogo: (page: Page): Locator => page.locator("xpath=//region[@aria-label='Mobile header']//a[normalize-space(text())='Onespan Logo']"),
};