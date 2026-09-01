import { Page } from '@playwright/test';
import { CLSHEALTHSAFETYPageLocators } from '../locators/CLSHEALTHSAFETYPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CLSHEALTHSAFETYPage {
  private page: Page;
  private L: ReturnType<typeof CLSHEALTHSAFETYPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CLSHEALTHSAFETYPageLocators(page);
  }
  async clickConstructionExoskeletons() {
    await smartClick(this.L.constructionExoskeletonsLink);
  }
}