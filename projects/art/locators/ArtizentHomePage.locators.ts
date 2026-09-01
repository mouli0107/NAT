import { Page, Locator } from '@playwright/test';

export const ArtizentHomePageLocators = {
  /** Artizent logo link in the main navigation, links to home page */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[contains(@href,'/')]//img[@alt='Artizent']
  logoLink: (page: Page): Locator =>
    page.locator("xpath=//nav//a[.//img[@alt='Artizent']]"),

  /** "Services" dropdown button in main navigation */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[contains(.,'Services')]
  servicesButton: (page: Page): Locator =>
    page.locator("xpath=//nav//button[contains(normalize-space(.),'Services')]"),

  /** "Astra" dropdown button in main navigation */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[contains(.,'Astra')]
  astraButton: (page: Page): Locator =>
    page.locator("xpath=//nav//button[contains(normalize-space(.),'Astra')]"),

  /** "Case Studies" link in main navigation */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[contains(@href,'case-studies')]
  caseStudiesLink: (page: Page): Locator =>
    page.locator("xpath=//nav//a[contains(@href,'insights/case-studies') and contains(normalize-space(.),'Case Studies')]"),

  /** "Careers" link in main navigation */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[contains(@href,'careers')]
  careersLink: (page: Page): Locator =>
    page.locator("xpath=//nav//a[contains(@href,'insights/careers') and contains(normalize-space(.),'Careers')]"),

  /** "About Us" dropdown button in main navigation */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//button[contains(.,'About Us')]
  aboutUsButton: (page: Page): Locator =>
    page.locator("xpath=//nav//button[contains(normalize-space(.),'About Us')]"),

  /** "Get in Touch" call-to-action link in main navigation */
  // Uniqueness: unique | Stability: stable | Fallback: //nav//a[contains(@href,'contact')]
  getInTouchLink: (page: Page): Locator =>
    page.locator("xpath=//nav//a[contains(@href,'contact') and contains(normalize-space(.),'Get in Touch')]"),

  /** Main hero heading on the home page (structural, avoids dynamic promo text match) */
  // Uniqueness: unique | Stability: fragile — content changes with campaigns | Fallback: //main//h1[1]
  heroHeading: (page: Page): Locator =>
    page.locator("xpath=//h1[1]"),

  /** "Explore Our Work" hero call-to-action link */
  // Uniqueness: unique | Stability: stable | Fallback: //a[contains(@href,'insights/case-studies') and contains(.,'Explore Our Work')]
  exploreOurWorkLink: (page: Page): Locator =>
    page.locator("xpath=//a[contains(@href,'insights/case-studies') and contains(normalize-space(.),'Explore Our Work')]"),

  /** Promotional banner link for the Tricentis Transform 2026 Dallas event */
  // Uniqueness: unique | Stability: fragile — promotional/time-bound content | Fallback: //a[contains(@href,'tricentis-transform-2026-dallas')]
  tricentisEventLink: (page: Page): Locator =>
    page.locator("xpath=//a[contains(@href,'meet-artizent-tricentis-transform-2026-dallas')]"),

  /** "Our Enterprise AI Stack" section heading */
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(.,'Enterprise AI Stack')]
  enterpriseAiStackHeading: (page: Page): Locator =>
    page.locator("xpath=//h2[contains(normalize-space(.),'Our Enterprise AI Stack')]"),

  /** "Software & Product Engineering" tab within the Platform practices tablist */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@role='tab' and contains(.,'Software')]
  softwareProductEngineeringTab: (page: Page): Locator =>
    page.locator("xpath=//*[@role='tablist']//*[@role='tab'][contains(normalize-space(.),'Software & Product Engineering')]"),

  /** "Data & Analytics" tab within the Platform practices tablist */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@role='tab' and contains(.,'Data')]
  dataAnalyticsTab: (page: Page): Locator =>
    page.locator("xpath=//*[@role='tablist']//*[@role='tab'][contains(normalize-space(.),'Data & Analytics')]"),

  /** "Agentic Enterprise" tab within the Platform practices tablist */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@role='tab' and contains(.,'Agentic')]
  agenticEnterpriseTab: (page: Page): Locator =>
    page.locator("xpath=//*[@role='tablist']//*[@role='tab'][contains(normalize-space(.),'Agentic Enterprise')]"),

  /** "Cloud & Cybersecurity" tab within the Platform practices tablist */
  // Uniqueness: unique | Stability: stable | Fallback: //button[@role='tab' and contains(.,'Cloud')]
  cloudCybersecurityTab: (page: Page): Locator =>
    page.locator("xpath=//*[@role='tablist']//*[@role='tab'][contains(normalize-space(.),'Cloud & Cybersecurity')]"),

  /** "Voices of Trust" testimonials section heading */
  // Uniqueness: unique | Stability: stable | Fallback: //h2[contains(.,'Voices of Trust')]
  voicesOfTrustHeading: (page: Page): Locator =>
    page.locator("xpath=//h2[contains(normalize-space(.),'Voices of Trust')]"),

  /** "Previous testimonial" navigation button within the client testimonials region */
  // Uniqueness: unique | Stability: stable | Fallback: //*[@aria-label='Client testimonials']//button[contains(.,'Previous')]
  previousTestimonialButton: (page: Page): Locator =>
    page.locator("xpath=//*[@aria-label='Client testimonials']//button[contains(normalize-space(.),'Previous testimonial')]"),

  /** "Next testimonial" navigation button within the client testimonials region */
  // Uniqueness: unique | Stability: stable | Fallback: //*[@aria-label='Client testimonials']//button[contains(.,'Next')]
  nextTestimonialButton: (page: Page): Locator =>
    page.locator("xpath=//*[@aria-label='Client testimonials']//button[contains(normalize-space(.),'Next testimonial')]"),
};