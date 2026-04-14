import { Page } from '@playwright/test';
import { PaymentCardDetailsPageLocators } from '../locators/PaymentCardDetailsPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, fillKendoGridDates, waitAndDismissAnyKendoAlert } from '../helpers/kendo';
export class PaymentCardDetailsPage {
  private page: Page;
  private L: ReturnType<typeof PaymentCardDetailsPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = PaymentCardDetailsPageLocators(page);
  }
  async clickNewPaymentMethod() {
    await smartClick(this.L.newPaymentMethod);
  }
  async clickSave() {
    await smartClick(this.L.saveButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
  async clickCardAccountTypeCardAccountNu() {
    await smartClick(this.L.cardAccountTypeCardAccountNu);
  }
}