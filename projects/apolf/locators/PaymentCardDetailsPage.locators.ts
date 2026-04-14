import { Page } from '@playwright/test';

export const PaymentCardDetailsPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  newPaymentMethod: (page: Page) => page.locator('xpath=//*[@id=\'spnNewPaymentMethod\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  saveButton: (page: Page) => page.locator('xpath=//*[@id=\'submit\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  cardAccountTypeCardAccountNu: (page: Page) => page.locator('xpath=//*[@id=\'divPaymentProgress\']//section').filter({ visible: true }).first(),
};
