import { Page } from '@playwright/test';
import { WwwPageLocators } from '../locators/WwwPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class WwwPage {
  private page: Page;
  private L: ReturnType<typeof WwwPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = WwwPageLocators(page);
  }
  async clickFidoHardwareAuthenticatorsSt() {
    await smartClick(this.L.fidoHardwareAuthenticatorsStLink);
  }
}