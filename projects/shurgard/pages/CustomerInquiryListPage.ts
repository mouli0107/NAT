import { Page } from '@playwright/test';
import { CustomerInquiryListPageLocators } from '../locators/CustomerInquiryListPage.locators';
import { smartClick } from '../helpers/universal';

export class CustomerInquiryListPage {
  private page: Page;
  private L: ReturnType<typeof CustomerInquiryListPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = CustomerInquiryListPageLocators(page);
  }

  /** Click an inquiry row by display name, e.g. "Inquiry 1" */
  async clickInquiry(name: string) {
    await smartClick(this.L.inquiryLink(name));
  }
}
