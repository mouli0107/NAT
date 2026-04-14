import { Page } from '@playwright/test';

export const FormSettingsPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  formnameInput: (page: Page) => page.locator('xpath=//*[@id=\'FormName\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  feeenabledCheckbox: (page: Page) => page.locator('xpath=//*[@id=\'FeeEnabled\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  amountInput: (page: Page) => page.locator('xpath=//*[@id=\'Amount\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  percentageorfixedCheckbox: (page: Page) => page.locator('xpath=//*[@id=\'rdoFixed\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  transactionfeeInput: (page: Page) => page.locator('xpath=//*[@id=\'transactionFee\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  pertansactionfeeInput: (page: Page) => page.locator('xpath=//*[@id=\'perTansactionFee\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  paymentplanenabledCheckbox: (page: Page) => page.locator('xpath=//*[@id=\'PaymentPlanEnabled\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  btncreatepaymentplanButton: (page: Page) => page.locator('xpath=//*[@id=\'btnCreatePaymentPlan\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  txtpaymentplannameInput: (page: Page) => page.locator('xpath=//*[@id=\'txtPaymentPlanName\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  txtnoofpaymentsInput: (page: Page) => page.locator('xpath=//*[@id=\'txtNoOfPayments\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  nextButton2: (page: Page) => page.locator('xpath=//*[@id=\'btnCreateFormPaymentPlan\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  txtnoofdaysforpaymentdueInput: (page: Page) => page.locator('xpath=//*[@id=\'txtNoOfDaysforPaymentDue\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  paymentdateInput: (page: Page) => page.locator('xpath=//*[@id=\'PaymentDate\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  saveButton: (page: Page) => page.locator('xpath=//*[@id=\'btnSaveOnlineForms\']').filter({ visible: true }).first(),
};
