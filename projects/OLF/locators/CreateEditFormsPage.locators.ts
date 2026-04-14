import { Page } from '@playwright/test';

export const CreateEditFormsPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  addNewFormButton: (page: Page) => page.locator('xpath=//*[@id=\'btnNewForm\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  nextButton: (page: Page) => page.locator('xpath=//*[@id=\'btnSelectFormCreationNext\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  searchInput: (page: Page) => page.locator('xpath=//*[@id=\'searchValue\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  sendButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Send\']').filter({ visible: true }).first(),
};
