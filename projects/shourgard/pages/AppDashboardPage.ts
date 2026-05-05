import { Page } from '@playwright/test';
import { AppDashboardPageLocators } from '@locators/AppDashboardPage.locators';

export class AppDashboardPage {
  constructor(private readonly page: Page) {}

  async navigateToDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  async navigateToHome(): Promise<void> {
    await this.page.goto('/');
  }

  async navigateToLogin(): Promise<void> {
    await this.page.goto('/login');
  }

  async clickUsernameField(): Promise<void> {
    const loc = AppDashboardPageLocators.usernameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async fillUsername(username: string): Promise<void> {
    const loc = AppDashboardPageLocators.usernameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(username);
  }

  async clickPasswordField(): Promise<void> {
    const loc = AppDashboardPageLocators.passwordInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async fillPassword(password: string): Promise<void> {
    const loc = AppDashboardPageLocators.passwordInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(password);
  }

  async clickBelgiumButton(): Promise<void> {
    const loc = AppDashboardPageLocators.belgiumButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickStore001Button(): Promise<void> {
    const loc = AppDashboardPageLocators.store001Button(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToCustomerSearch(): Promise<void> {
    await this.page.goto('/customer-search');
  }

  async fillFirstName(firstName: string): Promise<void> {
    const loc = AppDashboardPageLocators.firstNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(firstName);
  }

  async selectCustomerType(customerType: string): Promise<void> {
    const loc = AppDashboardPageLocators.customerTypeDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(customerType);
  }

  async clickSearchButton(): Promise<void> {
    const loc = AppDashboardPageLocators.searchButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickHarshJoshiLink(): Promise<void> {
    const loc = AppDashboardPageLocators.harshJoshiLink(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async navigateToCustomerInformation(customerId: string): Promise<void> {
    await this.page.goto(`/customer-management/customer-information/${customerId}`);
  }

  async navigateToCustomerInquiryList(customerId: string): Promise<void> {
    await this.page.goto(`/customer-management/customer-inquiry-list/${customerId}`);
  }

  async clickInquiry1Link(): Promise<void> {
    const loc = AppDashboardPageLocators.inquiry1Link(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async clickDate27042026(): Promise<void> {
    const loc = AppDashboardPageLocators.dateButton27042026(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async clearNeedDateInput(): Promise<void> {
    const loc = AppDashboardPageLocators.needDateInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill('');
  }

  async selectInquiryWhy(value: string): Promise<void> {
    const loc = AppDashboardPageLocators.inquiryWhyDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(value);
  }

  async fillInquiryWhyInput(value: string): Promise<void> {
    const loc = AppDashboardPageLocators.inquiryWhyInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(value);
  }

  async fillEditWhat(text: string): Promise<void> {
    const loc = AppDashboardPageLocators.editWhatTextarea(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(text);
  }

  async selectInquiryObjection(value: string): Promise<void> {
    const loc = AppDashboardPageLocators.inquiryObjectionDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(value);
  }

  async fillInquiryObjectionInput(value: string): Promise<void> {
    const loc = AppDashboardPageLocators.inquiryObjectionInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(value);
  }

  async selectInquiryOCObjection(value: string): Promise<void> {
    const loc = AppDashboardPageLocators.inquiryOCObjectionDropdown(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.selectOption(value);
  }

  async fillInquiryOCObjectionInput(value: string): Promise<void> {
    const loc = AppDashboardPageLocators.inquiryOCObjectionInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(value);
  }

  async clickSaveButton(): Promise<void> {
    const loc = AppDashboardPageLocators.saveButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      loc.click()
    ]);
  }

  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async getUsernameInputValue(): Promise<string> {
    const loc = AppDashboardPageLocators.usernameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async getPasswordInputValue(): Promise<string> {
    const loc = AppDashboardPageLocators.passwordInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async getFirstNameInputValue(): Promise<string> {
    const loc = AppDashboardPageLocators.firstNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.inputValue()) ?? '';
  }

  async isSearchButtonVisible(): Promise<boolean> {
    const loc = AppDashboardPageLocators.searchButton(this.page);
    return await loc.isVisible();
  }

  async isSaveButtonVisible(): Promise<boolean> {
    const loc = AppDashboardPageLocators.saveButton(this.page);
    return await loc.isVisible();
  }
}