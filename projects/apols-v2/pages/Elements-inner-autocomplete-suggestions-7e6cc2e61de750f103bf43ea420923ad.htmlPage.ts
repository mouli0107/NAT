import { Page } from '@playwright/test';
import { Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPageLocators } from '../locators/Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage {
  private page: Page;
  private L: ReturnType<typeof Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPageLocators(page);
  }
  async clickNousInfosystems24thMainRoadN() {
    await smartClick(this.L.nousInfosystems24thMainRoadN);
  }
}