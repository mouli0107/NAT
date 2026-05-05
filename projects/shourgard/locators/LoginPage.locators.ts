import { Page } from '@playwright/test';

export const LoginPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  emailInput: (page: Page) => page.locator('xpath=//*[@id=\'exampleInputEmail1\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  passwordInput: (page: Page) => page.locator('xpath=//*[@id=\'exampleInputPassword1\']').filter({ visible: true }).first(),
};
