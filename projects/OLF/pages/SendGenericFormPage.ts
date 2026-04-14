import { Page } from '@playwright/test';
import { SendGenericFormPageLocators } from '../locators/SendGenericFormPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class SendGenericFormPage {
  private page: Page;
  private L: ReturnType<typeof SendGenericFormPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = SendGenericFormPageLocators(page);
  }
  async clickDeselectAllRows() {
    await smartClick(this.L.deselectAllRowsCheckbox);
  }
  async clickRdoall() {
    await smartClick(this.L.allandprimaryonlyRadio);
  }
  async enableRdoall() {
    await smartCheck(this.L.allandprimaryonlyRadio);
  }
  async clickPublish() {
    await smartClick(this.L.publishButton);
  }
  async clickTxtto() {
    await smartClick(this.L.txttoInput);
  }
  async fillTxtto(value: string) {
    await smartFill(this.L.txttoInput, value);
  }
  async clickSend() {
    await smartClick(this.L.sendButton2);
  }
}