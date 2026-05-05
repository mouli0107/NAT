import { Page } from '@playwright/test';
import { ContactUsPageLocators } from '../locators/ContactUsPage.locators';

export class ContactUsPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the Contact Us page
   */
  async navigate(): Promise<void> {
    await this.page.goto('https://www.onespan.com/contact-us');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click the "Request demo" link in the main header navigation
   * This action triggers navigation to the demo request page
   */
  async clickRequestDemo(): Promise<void> {
    const requestDemoLink = ContactUsPageLocators.requestDemoLink(this.page);
    await requestDemoLink.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      requestDemoLink.click()
    ]);
  }
}