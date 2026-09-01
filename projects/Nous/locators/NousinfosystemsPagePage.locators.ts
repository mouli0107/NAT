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
  newsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[contains(@href,
  eventsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[contains(@href,
  careersLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[contains(@href,
  contactUsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[contains(@href,
  servicesLink: (page: Page): Locator => page.locator('xpath=//nav[not(@aria-label)]//a[contains(@href,
  industriesLink: (page: Page): Locator => page.locator('xpath=//nav[not(@aria-label)]//a[contains(@href,
  competencyLink: (page: Page): Locator => page.locator('xpath=//nav[not(@aria-label)]//a[contains(@href,
  insightsLink: (page: Page): Locator => page.locator('xpath=//nav[not(@aria-label)]//a[contains(@href,
  companyLink: (page: Page): Locator => page.locator('xpath=//nav[not(@aria-label)]//a[contains(@href,
  searchInput: (page: Page): Locator => page.locator('xpath=//input[@aria-label="Search"]'),
  searchButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Search"]'),
  linkedinLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  twitterLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  facebookLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  carouselPreviousButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Previous"]'),
  carouselNextButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Next"]'),
  digitalProductEngineeringTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),
  cloudSolutionsTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),
  digitalServicesTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),
  dataAnalyticsTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),
  aiAutomationTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),
  qeSpecialistLeaderTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),
  mainHeading: (page: Page): Locator => page.locator('xpath=//h1[contains(normalize-space(text()),
  digitalProductEngineeringLearnMore: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  aiAutomationHeading: (page: Page): Locator => page.locator('xpath=//h4[contains(normalize-space(text()),
  generativeAiLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  agenticAiLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  aiPoweredBusinessLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  aiAutomationLearnMore: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  azureLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  gcpLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  salesforceLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  cloudLearnMore: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  dataVisualizationLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  dataAnalyticsLearnMore: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  digitalExperienceLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  devopsLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  digitalLearnMore: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  qualityAssuranceLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
  testEngineeringLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,
};
