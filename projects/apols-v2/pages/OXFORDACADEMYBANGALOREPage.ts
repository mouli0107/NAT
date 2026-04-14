import { Page } from '@playwright/test';
import { OXFORDACADEMYBANGALOREPageLocators } from '../locators/OXFORDACADEMYBANGALOREPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class OXFORDACADEMYBANGALOREPage {
  private page: Page;
  private L: ReturnType<typeof OXFORDACADEMYBANGALOREPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = OXFORDACADEMYBANGALOREPageLocators(page);
  }
  async clickTxtusername() {
    await smartClick(this.L.emailInput);
  }
  async clickTxtuserpassword() {
    await smartClick(this.L.passwordInput);
  }
  async clickLogin() {
    await smartClick(this.L.loginButton);
  }
  async clickHallRebeParent() {
    await smartClick(this.L.hallRebeParentButton);
  }
}