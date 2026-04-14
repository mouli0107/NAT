import { Page } from '@playwright/test';

export const OXFORDACADEMYBANGALOREPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  emailInput: (page: Page) => page.locator('xpath=//*[@id=\'txtUserName\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  passwordInput: (page: Page) => page.locator('xpath=//*[@id=\'txtUserPassword\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  loginButton: (page: Page) => page.locator('xpath=//*[@id=\'btnLoginUser\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  hallRebeParentButton: (page: Page) => page.locator('xpath=//*[@id=\'PARENT\']').filter({ visible: true }).first(),
};
