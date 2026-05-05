import { Page, Locator } from '@playwright/test';

export const NousinfosystemsPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'industries') and normalize-space(.)='Industries']
  industriesNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(@href,"industries") and normalize-space(.)="Industries"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(normalize-space(.),"Banking & Financial Services")]
  bankingFinancialServicesLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(.),"Banking & Financial Services")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'competency') and normalize-space(.)='Competency']
  competencyNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(@href,"competency") and normalize-space(.)="Competency"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(normalize-space(.),"AI & Automation")]
  aiAutomationLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(.),"AI & Automation")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'insights') and normalize-space(.)='Insights']
  insightsNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(@href,"insights") and normalize-space(.)="Insights"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(normalize-space(.),"Case Studies")]
  caseStudiesLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(.),"Case Studies")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'company') and normalize-space(.)='Company']
  companyNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(@href,"company") and normalize-space(.)="Company"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[contains(normalize-space(.),"About Us")]
  aboutUsLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(.),"About Us")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(normalize-space(.),"AWS")]
  awsLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"aws") and contains(normalize-space(.),"AWS")]'),
};