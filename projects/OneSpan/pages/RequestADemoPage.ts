import { Page } from '@playwright/test';
import { RequestADemoPageLocators } from '../locators/RequestADemoPage.locators';

export class RequestADemoPage {
  private page: Page;
  private readonly url = 'https://www.onespan.com/products/request-a-demo';
  private readonly thankYouUrl = 'https://www.onespan.com/products/request-a-demo/thank-you';

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url, { waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    const heading = RequestADemoPageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillFirstName(firstName: string): Promise<void> {
    const locator = RequestADemoPageLocators.firstNameInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    const locator = RequestADemoPageLocators.lastNameInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(lastName);
  }

  async fillEmail(email: string): Promise<void> {
    const locator = RequestADemoPageLocators.emailInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(email);
  }

  async fillCompany(company: string): Promise<void> {
    const locator = RequestADemoPageLocators.companyInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(company);
  }

  async fillIndustry(industry: string): Promise<void> {
    const locator = RequestADemoPageLocators.industryInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(industry);
  }

  async selectIndustryOption(option: string): Promise<void> {
    const locator = RequestADemoPageLocators.industryInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await this.page.keyboard.type(option);
    await this.page.keyboard.press('Enter');
  }

  async fillPhone(phone: string): Promise<void> {
    const locator = RequestADemoPageLocators.phoneInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(phone);
  }

  async fillCountry(country: string): Promise<void> {
    const locator = RequestADemoPageLocators.countryInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(country);
  }

  async selectCountryOption(option: string): Promise<void> {
    const locator = RequestADemoPageLocators.countryInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await this.page.keyboard.type(option);
    await this.page.keyboard.press('Enter');
  }

  async fillBusinessInterest(interest: string): Promise<void> {
    const locator = RequestADemoPageLocators.businessInterestInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(interest);
  }

  async selectBusinessInterestOption(option: string): Promise<void> {
    const locator = RequestADemoPageLocators.businessInterestInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
    await this.page.keyboard.type(option);
    await this.page.keyboard.press('Enter');
  }

  async fillComments(comments: string): Promise<void> {
    const locator = RequestADemoPageLocators.commentsInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(comments);
  }

  async clickComments(): Promise<void> {
    const locator = RequestADemoPageLocators.commentsInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickSubmit(): Promise<void> {
    const locator = RequestADemoPageLocators.submitButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async submitForm(formData: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    industry: string;
    phone: string;
    country: string;
    businessInterest: string;
    comments?: string;
  }): Promise<void> {
    await this.fillFirstName(formData.firstName);
    await this.fillLastName(formData.lastName);
    await this.fillEmail(formData.email);
    await this.fillCompany(formData.company);
    await this.fillIndustry(formData.industry);
    await this.fillPhone(formData.phone);
    await this.fillCountry(formData.country);
    await this.fillBusinessInterest(formData.businessInterest);
    if (formData.comments) {
      await this.fillComments(formData.comments);
    }
    await this.clickSubmit();
  }

  async isOnThankYouPage(): Promise<boolean> {
    return this.page.url().includes(this.thankYouUrl);
  }

  async waitForThankYouPage(): Promise<void> {
    await this.page.waitForURL(this.thankYouUrl, { timeout: 10000 });
  }
}