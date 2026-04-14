import { Page } from '@playwright/test';
import { Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPageLocators } from '../locators/Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage {
  private page: Page;
  private L: ReturnType<typeof Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPageLocators(page);
  }
  async click1234123412341234() {
    await smartClick(this.L.input1234123412341234Input);
  }
  async fillExpirationDateMmYy(value: string) {
    await smartFill(this.L.mmYyInput, value);
  }
  async fillSecurityCode(value: string) {
    await smartFill(this.L.cvcInput, value);
  }
  async clickBillingaddressNameinput() {
    await smartClick(this.L.billingaddressNameinputInput);
  }
  async fillCountryOrRegion(value: string) {
    await smartFill(this.L.countrySelect, value);
  }
  async fillAddressLine1(value: string) {
    await smartFill(this.L.billingaddressAddressline1inInput, value);
  }
  async clickBillingaddressLocalityinput() {
    await smartClick(this.L.billingaddressLocalityinputInput);
  }
}