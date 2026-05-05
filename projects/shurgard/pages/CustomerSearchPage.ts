import { Page } from '@playwright/test';
import { CustomerSearchPageLocators } from '../locators/CustomerSearchPage.locators';
import { smartFill, smartClick } from '../helpers/universal';

export class CustomerSearchPage {
  private page: Page;
  private L: ReturnType<typeof CustomerSearchPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = CustomerSearchPageLocators(page);
  }

  // TC003
  async searchCustomer(value: string) {
    await smartFill(this.L.customerInput, value);
  }

  async clickNewCustomer() {
    await smartClick(this.L.newCustomerButton);
  }

  // TC004 — Customer Search
  async fillFirstName(value: string) {
    await smartFill(this.L.firstNameInput, value);
  }

  async selectCustomerType(value: string) {
    await this.L.customerTypeSelect.waitFor({ state: 'visible' });
    await this.L.customerTypeSelect.selectOption(value);
  }

  async clickSearch() {
    await smartClick(this.L.searchButton);
  }

  /** Click the first row result link matching the given customer name */
  async clickCustomerResult(name: string) {
    const resultLink = this.page.locator(
      `xpath=//a[contains(normalize-space(text()),'${name}')]`
    ).filter({ visible: true }).first();
    await resultLink.waitFor({ state: 'visible', timeout: 80000 });
    await resultLink.click();
  }
}
