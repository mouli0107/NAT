import { Page } from '@playwright/test';

export const PaymentPlanPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  paymentplanoptionsRadio: (page: Page) => page.locator('xpath=//*[@id=\'rdopaymentPlanOptions2\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  continueButton: (page: Page) => page.locator('xpath=//*[@id=\'btnContinue\']').filter({ visible: true }).first(),
};
