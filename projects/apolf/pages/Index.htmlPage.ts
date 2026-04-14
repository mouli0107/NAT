import { Page } from '@playwright/test';
import { Index.htmlPageLocators } from '../locators/Index.htmlPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class Index.htmlPage {
  private page: Page;
  private L: ReturnType<typeof Index.htmlPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = Index.htmlPageLocators(page);
  }
  async fillFullName(value: string) {
    await smartFill(this.L.fullNameInput, value);
  }
  async fill4111111111111111(value: string) {
    await smartFill(this.L.input4111111111111111Input, value);
  }
  async fillMmYy(value: string) {
    await smartFill(this.L.mmYyInput, value);
  }
  async fillCvc(value: string) {
    await smartFill(this.L.cvcInput, value);
  }
  async fillAddressLine1(value: string) {
    await smartFill(this.L.addressLine1Input, value);
  }
  async fillCity(value: string) {
    await smartFill(this.L.cityInput, value);
  }
  async fillAddressRegion(value: string) {
    await smartFill(this.L.addressRegionSelect, value);
  }
  async fillZip(value: string) {
    await smartFill(this.L.zipInput, value);
  }
}