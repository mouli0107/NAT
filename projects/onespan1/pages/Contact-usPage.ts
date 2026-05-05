import { Page } from '@playwright/test';
import { Contact-usPageLocators } from '../locators/Contact-usPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Contact-usPage {
  private page: Page;
  private L: ReturnType<typeof Contact-usPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Contact-usPageLocators(page);
  }
  async clickFirstName() {
    await smartClick(this.L.firstNameInput);
  }
  async clickBusinessEmail() {
    await smartClick(this.L.emailInput);
  }
  async fillBusinessInterest(value: string) {
    await smartFill(this.L.businessInterestCSelect, value);
  }
  async fillCountry(value: string) {
    await smartFill(this.L.countrySelect, value);
  }
  async fillLastName(value: string) {
    await smartFill(this.L.lastNameInput, value);
  }
  async fillTitle(value: string) {
    await smartFill(this.L.titleInput, value);
  }
  async fillCompanyName(value: string) {
    await smartFill(this.L.companyInput, value);
  }
  async fillPhoneNumber(value: string) {
    await smartFill(this.L.phoneInput, value);
  }
  async clickCommentsOptional() {
    await smartClick(this.L.commentsOptionalInput);
  }
}