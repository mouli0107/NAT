import { Page } from '@playwright/test';

export const SendGenericFormPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  deselectAllRowsCheckbox2: (page: Page) => page.locator('#GridStudentDetails th input[type="checkbox"]').first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  allandprimaryonlyRadio: (page: Page) => page.locator('xpath=//*[@id=\'rdoAll\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  publishButton: (page: Page) => page.locator('xpath=//*[@id=\'btnPublish\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  txttoInput: (page: Page) => page.locator('xpath=//*[@id=\'txtTo\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  sendButton2: (page: Page) => page.locator('xpath=//*[@id=\'btnSend\']').filter({ visible: true }).first(),
};
