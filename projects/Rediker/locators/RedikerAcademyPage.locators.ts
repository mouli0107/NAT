import { Page } from '@playwright/test';

export const RedikerAcademyPageLocators = {
  emailInput: (page: Page) => page.locator('#txtUserName'),
  passwordInput: (page: Page) => page.locator('#txtUserPassword'),
  chkremembermeCheckbox: (page: Page) => page.locator('#chkRememberme'),
  loginButton: (page: Page) => page.locator('#btnLoginUser'),
  enterYourPassword: (page: Page) => page.locator('xpath=//*[@id="frmLogin"]/div[2]'),
};
