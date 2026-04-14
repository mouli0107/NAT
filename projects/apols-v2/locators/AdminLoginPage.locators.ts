import { Page } from '@playwright/test';

export function AdminLoginPageLocators(page: Page) {
  return {
    emailInput: page.locator('#txtUserName').first(),
    //  ↳ [name] xpath: //input[@name='email']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='Enter your email']/following-sibling::input[1]

    passwordInput: page.locator('#txtUserPassword').first(),
    //  ↳ [name] xpath: //input[@name='pwd']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='Enter your password']/following-sibling::input[1]

    loginButton: page.locator('#btnLoginUser').first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Login']
  };
}

export type AdminLoginPageLocatorMap = ReturnType<typeof AdminLoginPageLocators>;
