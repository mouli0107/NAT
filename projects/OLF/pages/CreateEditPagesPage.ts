import { Page } from '@playwright/test';
import { CreateEditPagesPageLocators } from '../locators/CreateEditPagesPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, fillKendoGridDates, waitAndDismissAnyKendoAlert } from '../helpers/kendo';
export class CreateEditPagesPage {
  private page: Page;
  private L: ReturnType<typeof CreateEditPagesPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = CreateEditPagesPageLocators(page);
  }
  async clickAddFromExistingQuestions() {
    await smartClick(this.L.addFromExistingQuestionsButton);
  }
  async clickDeselectAllRows() {
    await smartClick(this.L.deselectAllRowsCheckbox);
  }
  async clickSave() {
    await smartClick(this.L.saveButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
  async clickYes() {
    await smartClick(this.L.yesButton);
  }
  async click1moulis() {
    await smartClick(this.L.h1moulis);
  }
  async clickCreateEditForm() {
    await smartClick(this.L.createEditFormLink);
  }
}