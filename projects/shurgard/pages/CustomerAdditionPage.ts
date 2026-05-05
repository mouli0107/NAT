import { Page } from '@playwright/test';
import { CustomerAdditionPageLocators } from '../locators/CustomerAdditionPage.locators';
import { smartFill, smartClick, smartCheck } from '../helpers/universal';
import { waitAndDismissAnyKendoAlert } from '../helpers/kendo';

export class CustomerAdditionPage {
  private page: Page;
  private L: ReturnType<typeof CustomerAdditionPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = CustomerAdditionPageLocators(page);
  }

  async selectEnglishLanguage() {
    await smartCheck(this.L.langRadioEnglish);
  }

  /** Select a title from the Title dropdown (required field). Value = option text e.g. "Mr", "Mrs", "N/A" */
  async selectTitle(value: string) {
    await this.L.titleSelect.waitFor({ state: 'visible' });
    await this.L.titleSelect.selectOption({ label: value });
  }

  async fillFirstName(value: string) {
    await smartFill(this.L.firstNameInput, value);
  }

  async fillLastName(value: string) {
    await smartFill(this.L.lastNameInput, value);
  }

  async fillDateOfBirth(value: string) {
    await smartFill(this.L.dateOfBirthInput, value);
  }

  async fillPhoneNumber(value: string) {
    await smartFill(this.L.phoneNumberInput, value);
  }

  async fillEmail(value: string) {
    await smartFill(this.L.emailInput, value);
  }

  async clickSave() {
    await smartClick(this.L.saveButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
}
