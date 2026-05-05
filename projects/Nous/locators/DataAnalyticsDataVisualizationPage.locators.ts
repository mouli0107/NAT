import { Page, Locator } from '@playwright/test';

export const DataAnalyticsDataVisualizationPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(text(),'Custom accelerators')]
  customAcceleratorsHeading: (page: Page): Locator => page.locator('xpath=//h2[contains(normalize-space(text()),"Custom accelerators, assured results")]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(@aria-expanded,'true')]
  customAcceleratorsButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Custom accelerators, assured results")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //text()[contains(.,'Brochure')]/parent::*
  brochureText: (page: Page): Locator => page.locator('xpath=//*[normalize-space(text())="Brochure"]'),

  // Uniqueness: verify | Stability: acceptable - marketing text | Fallback: //h1[1]
  dataVisualizationLeadHeading: (page: Page): Locator => page.locator('xpath=//h1[contains(normalize-space(text()),"Generate insightful")]'),

  // Uniqueness: unique | Stability: stable - nav structure | Fallback: //a[normalize-space(text())="Competency"]
  competencyNavLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Competency")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[normalize-space(text())="AI & Automation"]
  aiAutomationLink: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="AI & Automation"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[normalize-space(text())="Generative AI"]
  generativeAILink: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="Generative AI"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[normalize-space(text())="Agentic AI"]
  agenticAILink: (page: Page): Locator => page.locator('xpath=//a[normalize-space(text())="Agentic AI"]'),

  // Uniqueness: verify | Stability: acceptable - text content | Fallback: //a[contains(text(),"AI Powered")]
  aiPoweredBusinessLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"AI Powered")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h2[normalize-space(text())="Data visualization"]
  dataVisualizationHeading: (page: Page): Locator => page.locator('xpath=//h2[normalize-space(text())="Data visualization"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="search"]
  searchBox: (page: Page): Locator => page.locator('xpath=//input[@role="searchbox"]'),

  // Uniqueness: unique | Stability: stable - aria label | Fallback: //button[contains(text(),"Search")]
  searchButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Search" or contains(normalize-space(text()),"Search")]'),

  // Uniqueness: unique | Stability: stable - nav structure | Fallback: //a[normalize-space(text())="News"]
  newsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="News"]'),

  // Uniqueness: unique | Stability: stable - nav structure | Fallback: //a[normalize-space(text())="Events"]
  eventsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="Events"]'),

  // Uniqueness: unique | Stability: stable - nav structure | Fallback: //a[normalize-space(text())="Careers"]
  careersLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="Careers"]'),

  // Uniqueness: unique | Stability: stable - nav structure | Fallback: //a[normalize-space(text())="Contact Us"]
  contactUsLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]//a[normalize-space(text())="Contact Us"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[normalize-space(text())="Services"]
  servicesLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Services")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[normalize-space(text())="Industries"]
  industriesLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Industries")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[normalize-space(text())="Insights"]
  insightsLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Insights")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[normalize-space(text())="Company"]
  companyLink: (page: Page): Locator => page.locator('xpath=//nav//a[contains(normalize-space(text()),"Company")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h3[normalize-space(text())="Power BI services"]
  powerBIServicesHeading: (page: Page): Locator => page.locator('xpath=//h3[normalize-space(text())="Power BI services"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h3[normalize-space(text())="Qlik"]
  qlikHeading: (page: Page): Locator => page.locator('xpath=//h3[normalize-space(text())="Qlik"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())="Previous"]
  previousButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Previous" or normalize-space(text())="Previous"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())="Next"]
  nextButton: (page: Page): Locator => page.locator('xpath=//button[@aria-label="Next" or normalize-space(text())="Next"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"Learn More") and contains(@href,"power-bi")]
  powerBILearnMoreLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Learn More") and contains(@href,"power-bi")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(text(),"Learn More") and contains(@href,"qlik")]
  qlikLearnMoreLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Learn More") and contains(@href,"qlik")]'),

  // Uniqueness: unique | Stability: stable — structural fallback | Fallback: //main//h1[1]
  mainHeading: (page: Page): Locator => page.locator('xpath=//main//h1[1]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav[@aria-label="Menu"]
  mainNavigation: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Menu"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[normalize-space(text())="Competency"]
  competencyLink: (page: Page): Locator => page.locator('xpath=//nav//a[normalize-space(text())="Competency"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="search"]
  searchInput: (page: Page): Locator => page.locator('xpath=//input[@role="searchbox" and @aria-label="Search"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(),"Data Visualization Design")]
  designStandardsHeading: (page: Page): Locator => page.locator('xpath=//h3[normalize-space(text())="Data Visualization Design Standards"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h3[contains(text(),"Custom Visuals")]
  customVisualsHeading: (page: Page): Locator => page.locator('xpath=//h3[normalize-space(text())="Custom Visuals in Power BI"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h2[normalize-space(text())="Services"]
  servicesHeading: (page: Page): Locator => page.locator('xpath=//h2[normalize-space(text())="Services"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h4[normalize-space(text())="Consulting"]
  consultingHeading: (page: Page): Locator => page.locator('xpath=//h4[normalize-space(text())="Consulting"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h4[normalize-space(text())="Development"]
  developmentHeading: (page: Page): Locator => page.locator('xpath=//h4[normalize-space(text())="Development"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h4[normalize-space(text())="Maintenance"]
  maintenanceHeading: (page: Page): Locator => page.locator('xpath=//h4[normalize-space(text())="Maintenance"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h2[normalize-space(text())="Why Nous?"]
  whyNousHeading: (page: Page): Locator => page.locator('xpath=//h2[normalize-space(text())="Why Nous?"]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Domain mastery")]
  domainMasteryButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Domain mastery")]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Versatile")]
  versatileSolutionsButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Versatile solutions")]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Local knowledge")]
  localKnowledgeButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Local knowledge")]'),

  // Uniqueness: unique | Stability: acceptable - text content | Fallback: //button[contains(text(),"Excellence center")]
  excellenceCenterButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Excellence center")]'),

  // Uniqueness: unique | Stability: stable | Fallback: //h2[normalize-space(text())="Resources"]
  resourcesHeading: (page: Page): Locator => page.locator('xpath=//h2[normalize-space(text())="Resources"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //*[normalize-space(text())="Case Study"]
  caseStudyText: (page: Page): Locator => page.locator('xpath=//*[normalize-space(text())="Case Study"]'),

  // Uniqueness: unique | Stability: stable | Fallback: //*[normalize-space(text())="Whitepaper"]
  whitepaperText: (page: Page): Locator => page.locator('xpath=//*[normalize-space(text())="Whitepaper"]'),
};
