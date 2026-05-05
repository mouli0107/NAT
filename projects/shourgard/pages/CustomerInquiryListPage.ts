import { Page } from '@playwright/test';
import { CustomerInquiryListPageLocators } from '../locators/CustomerInquiryListPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, fillKendoGridDates, waitAndDismissAnyKendoAlert } from '../helpers/kendo';
export class CustomerInquiryListPage {
  private page: Page;
  private L: ReturnType<typeof CustomerInquiryListPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CustomerInquiryListPageLocators(page);
  }
  async clickInquiry1() {
    await smartClick(this.L.inquiry1Link);
  }
  async fillDdMmYyyy(value: string) {
    await smartFill(this.L.ddMmYyyyInput, value);
  }
  async fillEditwhat(value: string) {
    await smartFill(this.L.numberInput, value);
  }
  async clickSave() {
    await smartClick(this.L.saveButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
}