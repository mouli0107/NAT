import { Page } from '@playwright/test';
import { CustomerInquiryDetailPageLocators } from '../locators/CustomerInquiryDetailPage.locators';
import { smartFill, smartClick } from '../helpers/universal';

export class CustomerInquiryDetailPage {
  private page: Page;
  private L: ReturnType<typeof CustomerInquiryDetailPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = CustomerInquiryDetailPageLocators(page);
  }

  async fillNeedDate(value: string) {
    await this.L.needDateInput.waitFor({ state: 'visible' });
    await this.L.needDateInput.click({ clickCount: 3 }); // select all existing text
    await this.L.needDateInput.fill(value);
  }

  async selectInquiryWhy(optionValue: string) {
    await this.L.inquiryWhySelect.waitFor({ state: 'visible' });
    await this.L.inquiryWhySelect.selectOption(optionValue);
  }

  async fillInquiryWhyDetail(value: string) {
    await smartFill(this.L.inquiryWhyInput, value);
  }

  async fillEditWhat(value: string) {
    await smartFill(this.L.editWhatTextarea, value);
  }

  async selectInquiryObjection(optionValue: string) {
    await this.L.inquiryObjectionSelect.waitFor({ state: 'visible' });
    await this.L.inquiryObjectionSelect.selectOption(optionValue);
  }

  async fillInquiryObjectionDetail(value: string) {
    await smartFill(this.L.inquiryObjectionInput, value);
  }

  async selectInquiryOCObjection(optionValue: string) {
    await this.L.inquiryOCObjectionSelect.waitFor({ state: 'visible' });
    await this.L.inquiryOCObjectionSelect.selectOption(optionValue);
  }

  async fillInquiryOCObjectionDetail(value: string) {
    await smartFill(this.L.inquiryOCObjectionInput, value);
  }

  async clickSave() {
    await smartClick(this.L.saveButton);
  }
}
