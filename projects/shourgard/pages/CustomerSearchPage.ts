import { Page } from '@playwright/test';
import { CustomerSearchPageLocators } from '../locators/CustomerSearchPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CustomerSearchPage {
  private page: Page;
  private L: ReturnType<typeof CustomerSearchPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CustomerSearchPageLocators(page);
  }
  async fillFirstName(value: string) {
    await smartFill(this.L.firstNameInput, value);
  }
  async fillSelectcustomertype(value: string) {
    await smartFill(this.L.selectcustomertypeSelect, value);
  }
  async clickSearch() {
    await smartClick(this.L.searchButton);
  }
}