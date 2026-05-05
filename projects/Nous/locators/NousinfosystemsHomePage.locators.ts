import { Page, Locator } from '@playwright/test';

export const NousinfosystemsHomePageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'agile-development')]
  agileDevelopmentLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"agile-development")]'),

  // Uniqueness: unique | Stability: acceptable - text label | Fallback: //a[contains(@href,'data-visualization')]
  dataVisualizationLink: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="Data Visualization"]'),

  // Uniqueness: unique | Stability: acceptable - visible label | Fallback: //button[contains(text(),"Versatile")]
  versatileSolutionsButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Versatile solutions regardless of company size"]'),

  // Uniqueness: unique | Stability: acceptable - visible label | Fallback: //button[contains(text(),"Local knowledge")]
  localKnowledgeButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Local knowledge, global relevance"]'),

  // Uniqueness: unique | Stability: acceptable - visible label | Fallback: //button[contains(text(),"Excellence center")]
  excellenceCenterButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Excellence center for data visualization"]'),

  // Uniqueness: unique | Stability: acceptable - visible label | Fallback: //button[contains(text(),"Custom accelerators")]
  customAcceleratorsButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Custom accelerators, assured results"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@class,"mega-menu-link") and normalize-space(text())="Services"]
  // @aria-haspopup="true" uniquely identifies the top-level mega-menu trigger (not sub-items like "Digital Application Services")
  servicesNavLink: (page: Page): Locator => page.locator('xpath=//a[@aria-haspopup="true" and normalize-space(text())="Services"]'),

  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[normalize-space(text())="Industries"]
  industriesNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Industries")]'),

  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[normalize-space(text())="Competency"]
  competencyNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Competency")]'),

  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[normalize-space(text())="Insights"]
  insightsNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Insights")]'),

  // Uniqueness: verify | Stability: stable | Fallback: //nav//a[normalize-space(text())="Company"]
  companyNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Company")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]//a[text()="News"]
  newsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="News"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]//a[text()="Events"]
  eventsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="Events"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]//a[text()="Careers"]
  careersLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="Careers"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]//a[text()="Contact Us"]
  contactUsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="Contact Us"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="search"]
  searchInput: (page: Page): Locator => page.locator('xpath=//input[@role="searchbox"]'),

  // Uniqueness: verify | Stability: stable | Fallback: //button[contains(@aria-label,"Search")]
  searchButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Search"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[text()="Previous"]
  previousButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Previous"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[text()="Next"]
  nextButton: (page: Page): Locator => page.locator('xpath=//button[normalize-space(text())="Next"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"linkedin.com")]
  linkedinLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"linkedin.com/company/nousinfosystems")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"twitter.com")]
  twitterLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"twitter.com/nousinfosystems")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"facebook.com")]
  facebookLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"facebook.com/NousInfosystems")]'),

  // FIX 11: Semantic content locators — NOT positional "N of 6" which breaks on tab reorder
  // Uniqueness: unique | Stability: stable — label-based | Fallback: //button[@role="tab"][1]
  digitalProductEngineeringTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),"Digital Product")]'),

  // Uniqueness: unique | Stability: stable — label-based | Fallback: //button[@role="tab"][2]
  cloudSolutionsTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),"Cloud Solutions")]'),

  // Uniqueness: unique | Stability: stable — label-based | Fallback: //button[@role="tab"][3]
  digitalServicesTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),"Digital Services")]'),

  // Uniqueness: unique | Stability: stable — label-based | Fallback: //button[@role="tab"][4]
  dataAnalyticsTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),"Data Analytics")]'),

  // Uniqueness: unique | Stability: stable — label-based | Fallback: //button[@role="tab"][5]
  aiAutomationTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),"AI")]'),

  // Uniqueness: unique | Stability: stable — label-based | Fallback: //button[@role="tab"][6]
  qeSpecialistTab: (page: Page): Locator => page.locator('xpath=//button[@role="tab" and contains(normalize-space(.),"QE")]'),

  // FIX 8: Use contains(@href) — exact href breaks on relative vs absolute and across environments
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"digital-product-engineering")]
  learnMoreDigitalProductLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"digital-product-engineering") and contains(normalize-space(text()),"Learn More")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"ai-automation")]
  learnMoreAiAutomationLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"competency/ai-automation") and contains(normalize-space(text()),"Learn More")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"cloud")]
  learnMoreCloudLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"competency/cloud") and contains(normalize-space(text()),"Learn More")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"data-analytics")]
  learnMoreDataAnalyticsLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"competency/data-analytics") and contains(normalize-space(text()),"Learn More")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,"digital")]
  learnMoreDigitalLink: (page: Page): Locator => page.locator('xpath=//a[contains(@href,"competency/digital") and contains(normalize-space(text()),"Learn More")]'),

  // Uniqueness: unique | Stability: stable — structural fallback | Fallback: //main//h1[1]
  mainHeading: (page: Page): Locator => page.locator('xpath=//main//h1[1]'),
};
