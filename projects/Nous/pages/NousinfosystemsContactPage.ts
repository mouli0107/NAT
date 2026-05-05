import { Page } from '@playwright/test';
import { NousinfosystemsContactPageLocators } from '@locators/NousinfosystemsContactPage.locators';

export class NousinfosystemsContactPage {
  constructor(private readonly page: Page) {}

  async navigateToHomepage(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async navigateToInfrastructureManagement(): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.infrastructureManagementLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickCareersLink(): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.careersLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickContactUsLink(): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.contactUsLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async fillName(name: string): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.nameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(name);
  }

  async fillEmail(email: string): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.emailInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(email);
  }

  async fillPhoneNumber(phoneNumber: string): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.phoneNumberInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(phoneNumber);
  }

  async fillCompanyName(companyName: string): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.companyNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(companyName);
  }

  async fillMessage(message: string): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.messageTextarea(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(message);
  }

  async checkConsentCheckbox(): Promise<void> {
    const loc = NousinfosystemsContactPageLocators.consentCheckbox(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.check();
  }

  async navigateToContactFormAnchor(): Promise<void> {
    await this.page.goto('/contact-us#wpcf7-f89-o1');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async waitForFormSubmission(): Promise<void> {
    await this.page.waitForURL('**/contact-us#wpcf7-f89-o1', { timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async isNameInputVisible(): Promise<boolean> {
    const loc = NousinfosystemsContactPageLocators.nameInput(this.page);
    return await loc.isVisible();
  }

  async isEmailInputVisible(): Promise<boolean> {
    const loc = NousinfosystemsContactPageLocators.emailInput(this.page);
    return await loc.isVisible();
  }

  async isPhoneInputVisible(): Promise<boolean> {
    const loc = NousinfosystemsContactPageLocators.phoneNumberInput(this.page);
    return await loc.isVisible();
  }

  async isCompanyInputVisible(): Promise<boolean> {
    const loc = NousinfosystemsContactPageLocators.companyNameInput(this.page);
    return await loc.isVisible();
  }

  async isMessageTextareaVisible(): Promise<boolean> {
    const loc = NousinfosystemsContactPageLocators.messageTextarea(this.page);
    return await loc.isVisible();
  }

  async isConsentCheckboxChecked(): Promise<boolean> {
    const loc = NousinfosystemsContactPageLocators.consentCheckbox(this.page);
    return await loc.isChecked();
  }

  async getNameInputValue(): Promise<string> {
    const loc = NousinfosystemsContactPageLocators.nameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async getEmailInputValue(): Promise<string> {
    const loc = NousinfosystemsContactPageLocators.emailInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async getPhoneInputValue(): Promise<string> {
    const loc = NousinfosystemsContactPageLocators.phoneNumberInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async getCompanyInputValue(): Promise<string> {
    const loc = NousinfosystemsContactPageLocators.companyNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async getMessageTextareaValue(): Promise<string> {
    const loc = NousinfosystemsContactPageLocators.messageTextarea(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }
}