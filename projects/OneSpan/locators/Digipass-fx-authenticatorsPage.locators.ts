import { Page } from '@playwright/test';

export const Digipass-fx-authenticatorsPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  requestADemoLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Request a demo\']').filter({ visible: true }).first(),
  solutionsButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Solutions\']').filter({ visible: true }).first(),
  secureTransactionSigningProtLink: (page: Page) => page.locator('xpath=//a[@aria-label=\'Secure Transaction Signing Protect financial transactions with security solutions that enhance CX and thwart social engineering\']').filter({ visible: true }).first(),
  strongCustomerAuthenticationLink: (page: Page) => page.locator('xpath=//a[@aria-label=\'Strong Customer Authentication Enable fast and secure account access with multi-factor authentication solutions that protect against account takeover attacks\']').filter({ visible: true }).first(),
};
