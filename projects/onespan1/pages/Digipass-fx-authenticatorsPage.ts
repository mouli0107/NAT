import { Page } from '@playwright/test';
import { Digipass-fx-authenticatorsPageLocators } from '../locators/Digipass-fx-authenticatorsPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Digipass-fx-authenticatorsPage {
  private page: Page;
  private L: ReturnType<typeof Digipass-fx-authenticatorsPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Digipass-fx-authenticatorsPageLocators(page);
  }
  async clickResources() {
    await smartClick(this.L.resourcesButton);
  }
  async clickCommunityPortal() {
    await smartClick(this.L.communityPortalLink);
  }
  async clickCompany() {
    await smartClick(this.L.companyButton);
  }
  async clickContactUs() {
    await smartClick(this.L.contactUsLink);
  }
}