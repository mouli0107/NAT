import { Page } from '@playwright/test';
import { LoadFormPageLocators } from '../locators/LoadFormPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, fillKendoGridDates, waitAndDismissAnyKendoAlert } from '../helpers/kendo';
export class LoadFormPage {
  private page: Page;
  private L: ReturnType<typeof LoadFormPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = LoadFormPageLocators(page);
  }
  async fillBtnsubmitapplicantform(value: string) {
    await smartFill(this.L.btnsubmitapplicantformButton, value);
  }
  async clickBtnsubmitapplicantform() {
    await smartClick(this.L.btnsubmitapplicantformButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
}