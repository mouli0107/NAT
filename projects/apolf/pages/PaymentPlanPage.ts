import { Page } from '@playwright/test';
import { PaymentPlanPageLocators } from '../locators/PaymentPlanPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class PaymentPlanPage {
  private page: Page;
  private L: ReturnType<typeof PaymentPlanPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = PaymentPlanPageLocators(page);
  }
  async clickRdopaymentplanoptions2() {
    await smartClick(this.L.paymentplanoptionsRadio);
  }
  async enableRdopaymentplanoptions2() {
    await smartCheck(this.L.paymentplanoptionsRadio);
  }
  async clickContinue() {
    await smartClick(this.L.continueButton);
  }
}