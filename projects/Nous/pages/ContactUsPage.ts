import { Page } from '@playwright/test';
import { ContactUsPageLocators } from '../locators/ContactUsPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class ContactUsPage {
  private page: Page;
  private L: ReturnType<typeof ContactUsPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = ContactUsPageLocators(page);
  }
  async fillName(value: string) {
    await smartFill(this.L.nameInput, value);
  }
  async fillEmail(value: string) {
    await smartFill(this.L.emailInput, value);
  }
  async fillPhoneNumber(value: string) {
    await smartFill(this.L.phoneInput, value);
  }
  async fillCompanyName(value: string) {
    await smartFill(this.L.companyNameInput, value);
  }
  async fillMessage(value: string) {
    await smartFill(this.L.messageInput, value);
  }
  async enableCheckbox815() {
    await smartCheck(this.L.checkbox815Checkbox);
  }
}