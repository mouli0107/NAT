import { Page } from '@playwright/test';
import { Request-a-demoPageLocators } from '../locators/Request-a-demoPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, fillKendoGridDates, waitAndDismissAnyKendoAlert } from '../helpers/kendo';
export class Request-a-demoPage {
  private page: Page;
  private L: ReturnType<typeof Request-a-demoPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Request-a-demoPageLocators(page);
  }
  async clickFirstName() {
    await smartClick(this.L.firstNameInput);
  }
  async fillLastName(value: string) {
    await smartFill(this.L.lastNameInput, value);
  }
  async fillEmailAddress(value: string) {
    await smartFill(this.L.emailInput, value);
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
  async clickSubmit() {
    await smartClick(this.L.submitButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
}