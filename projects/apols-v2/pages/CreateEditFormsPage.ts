import { Page } from '@playwright/test';
import { CreateEditFormsPageLocators } from '../locators/CreateEditFormsPage.locators';
import { smartClick } from '../helpers/universal';

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
    await this.page.waitForURL('**/FormsManager/FormSettings', { waitUntil: 'domcontentloaded' });
  }

  async clickSend() {
    await smartClick(this.L.sendButton);
    await this.page.waitForURL('**/FormsManager/SendGenericForm', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
  }
}
