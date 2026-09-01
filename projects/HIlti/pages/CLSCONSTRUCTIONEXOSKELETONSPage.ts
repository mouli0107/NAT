import { Page } from '@playwright/test';
import { CLSCONSTRUCTIONEXOSKELETONSPageLocators } from '../locators/CLSCONSTRUCTIONEXOSKELETONSPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CLSCONSTRUCTIONEXOSKELETONSPage {
  private page: Page;
  private L: ReturnType<typeof CLSCONSTRUCTIONEXOSKELETONSPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CLSCONSTRUCTIONEXOSKELETONSPageLocators(page);
  }
  async clickExoSShoulderExoskeleton() {
    await smartClick(this.L.exoSShoulderExoskeletonLink);
  }
}