import { Page } from '@playwright/test';
import { WwwPageLocators } from '../locators/WwwPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';

export class WwwPage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }
  async clickSolutions() {
    await smartClick(WwwPageLocators.solutionsButton(this.page));
  }
  async clickStrongCustomerAuthentication() {
    await smartClick(WwwPageLocators.strongCustomerAuthenticationLink(this.page));
  }
  async clickProductsButton() {
    await smartClick(WwwPageLocators.productsButton(this.page));
  }
}
