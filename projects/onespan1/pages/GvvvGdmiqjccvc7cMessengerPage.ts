import { Page } from '@playwright/test';
import { GvvvGdmiqjccvc7cMessengerPageLocators } from '@locators/GvvvGdmiqjccvc7cMessengerPage.locators';

export class GvvvGdmiqjccvc7cMessengerPage {
  constructor(private readonly page: Page) {}

  async assertRequestDemoVisible(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.requestDemoButton(this.page);
    await loc.waitFor({ state: 'visible' });
  }

  async assertFeaturedServicesVisible(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.featuredServicesText(this.page);
    await loc.waitFor({ state: 'visible' });
  }

  async assertCompanyHidden(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.companyButton(this.page);
    await loc.waitFor({ state: 'hidden' });
  }

  async clickResourcesButton(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.resourcesButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCommunityPortalLink(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.communityPortalLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCompanyButton(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.companyButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async waitForPopupAndSwitch(): Promise<Page> {
    const popupPromise = this.page.context().waitForEvent('page');
    const popup = await popupPromise;
    await popup.waitForLoadState('networkidle').catch(() => {});
    return popup;
  }

  async clickContactUsLink(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.contactUsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickFirstNameLabel(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.firstNameLabel(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clearFirstName(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.firstNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill('');
  }

  async clickBusinessEmailLabel(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.businessEmailLabel(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async fillEmail(email: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.emailInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(email);
  }

  async clearBusinessInterest(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.businessInterestDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill('');
  }

  async clearCountry(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.countryDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill('');
  }

  async fillFirstName(firstName: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.firstNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.lastNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(lastName);
  }

  async fillTitle(title: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.titleInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(title);
  }

  async selectIndustry(industry: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.industryDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(industry);
  }

  async fillCompany(company: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.companyInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(company);
  }

  async fillPhone(phone: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.phoneInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(phone);
  }

  async selectBusinessInterest(interest: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.businessInterestDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(interest);
  }

  async selectCountry(country: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.countryDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(country);
  }

  async clickCommentsLabel(): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.commentsLabel(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async fillComments(comments: string): Promise<void> {
    const loc = GvvvGdmiqjccvc7cMessengerPageLocators.commentsTextarea(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(comments);
  }

  async waitForPopupClose(): Promise<void> {
    await this.page.waitForEvent('close').catch(() => {});
  }
}