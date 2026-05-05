import { Page } from '@playwright/test';

export const LoginPageLocators = (page: Page) => ({
  emailInput:    page.locator("xpath=//*[@id='exampleInputEmail1']").filter({ visible: true }).first(),
  passwordInput: page.locator("xpath=//*[@id='exampleInputPassword1']").filter({ visible: true }).first(),
  // Case-insensitive via translate() — handles CSS text-transform: uppercase
  loginButton:   page.locator("xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'login')]").filter({ visible: true }).first(),

  // Error / alert message shown for invalid credentials
  // Angular SPA may use .alert, .error-msg, .invalid-feedback, or a toast
  errorMessage: page.locator([
    '.alert',
    '.alert-danger',
    '.error-message',
    '.invalid-feedback',
    '[class*="error"]',
    '[class*="alert"]',
    '[role="alert"]',
  ].join(', ')).filter({ visible: true }).first(),
});
