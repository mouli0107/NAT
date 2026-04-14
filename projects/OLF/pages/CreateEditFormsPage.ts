import { Page } from '@playwright/test';
import { CreateEditFormsPageLocators } from '../locators/CreateEditFormsPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class CreateEditFormsPage {
  private page: Page;
  private L: ReturnType<typeof CreateEditFormsPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CreateEditFormsPageLocators(page);
  }
  async clickAddNewForm() {
    await smartClick(this.L.addNewFormButton);
  }
  async clickNext() {
    await smartClick(this.L.nextButton);
  }
  async clickSearch() {
    await smartClick(this.L.searchInput);
  }
  async fillSearch(value: string) {
    await smartFill(this.L.searchInput, value);
  }
  async clickSend() {
    await smartClick(this.L.sendButton);
  }
}