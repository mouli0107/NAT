import { Page } from '@playwright/test';
import { ArtizentHomePageLocators } from '@locators/ArtizentHomePage.locators';

export class ArtizentHomePage {
  constructor(private readonly page: Page) {}

  /** Navigate to the Artizent home page (relative to baseURL) */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** Wait until the home page hero heading is visible, indicating the page has loaded */
  async waitForPageReady(): Promise<void> {
    const loc = ArtizentHomePageLocators.heroHeading(this.page);
    await loc.waitFor({ state: 'visible' });
  }

  /** Click the Artizent logo link to navigate back to the home page */
  async clickLogo(): Promise<void> {
    const loc = ArtizentHomePageLocators.logoLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }

  /** Click the "Services" dropdown button in the main navigation */
  async clickServicesButton(): Promise<void> {
    const loc = ArtizentHomePageLocators.servicesButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Astra" dropdown button in the main navigation */
  async clickAstraButton(): Promise<void> {
    const loc = ArtizentHomePageLocators.astraButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Case Studies" link in the main navigation */
  async clickCaseStudiesLink(): Promise<void> {
    const loc = ArtizentHomePageLocators.caseStudiesLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }

  /** Click the "Careers" link in the main navigation */
  async clickCareersLink(): Promise<void> {
    const loc = ArtizentHomePageLocators.careersLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }

  /** Click the "About Us" dropdown button in the main navigation */
  async clickAboutUsButton(): Promise<void> {
    const loc = ArtizentHomePageLocators.aboutUsButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Get in Touch" call-to-action link in the main navigation */
  async clickGetInTouchLink(): Promise<void> {
    const loc = ArtizentHomePageLocators.getInTouchLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }

  /** Click the "Explore Our Work" hero call-to-action link */
  async clickExploreOurWorkLink(): Promise<void> {
    const loc = ArtizentHomePageLocators.exploreOurWorkLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }

  /** Click the Tricentis Transform 2026 Dallas promotional event link */
  async clickTricentisEventLink(): Promise<void> {
    const loc = ArtizentHomePageLocators.tricentisEventLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click(),
    ]);
  }

  /** Get the text content of the main hero heading */
  async getHeroHeadingText(): Promise<string> {
    const loc = ArtizentHomePageLocators.heroHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  /** Get the text content of the "Our Enterprise AI Stack" section heading */
  async getEnterpriseAiStackHeadingText(): Promise<string> {
    const loc = ArtizentHomePageLocators.enterpriseAiStackHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  /** Click the "Software & Product Engineering" tab in the platform practices tablist */
  async clickSoftwareProductEngineeringTab(): Promise<void> {
    const loc = ArtizentHomePageLocators.softwareProductEngineeringTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Data & Analytics" tab in the platform practices tablist */
  async clickDataAnalyticsTab(): Promise<void> {
    const loc = ArtizentHomePageLocators.dataAnalyticsTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Agentic Enterprise" tab in the platform practices tablist */
  async clickAgenticEnterpriseTab(): Promise<void> {
    const loc = ArtizentHomePageLocators.agenticEnterpriseTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Cloud & Cybersecurity" tab in the platform practices tablist */
  async clickCloudCybersecurityTab(): Promise<void> {
    const loc = ArtizentHomePageLocators.cloudCybersecurityTab(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Get the text content of the "Voices of Trust" testimonials section heading */
  async getVoicesOfTrustHeadingText(): Promise<string> {
    const loc = ArtizentHomePageLocators.voicesOfTrustHeading(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  /** Click the "Previous testimonial" navigation button */
  async clickPreviousTestimonialButton(): Promise<void> {
    const loc = ArtizentHomePageLocators.previousTestimonialButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Click the "Next testimonial" navigation button */
  async clickNextTestimonialButton(): Promise<void> {
    const loc = ArtizentHomePageLocators.nextTestimonialButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  /** Check whether the "Services" dropdown button is visible in the main navigation */
  async isServicesButtonVisible(): Promise<boolean> {
    const loc = ArtizentHomePageLocators.servicesButton(this.page);
    return loc.isVisible();
  }
}