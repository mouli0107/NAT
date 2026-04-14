import { Page } from '@playwright/test';

export const CreateEditPagesPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  addFromExistingQuestionsButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Add From Existing Questions\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  deselectAllRowsCheckbox: (page: Page) => page.locator('#QuestionFormExistingFormsGrid th input[type="checkbox"]').first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  saveButton2: (page: Page) => page.locator('xpath=//*[@id=\'btnSaveQuestions\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  page2: (page: Page) => page.locator('xpath=//*[@id=\'1610\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  yesButton: (page: Page) => page.locator('xpath=//*[@id=\'okButton\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  page3: (page: Page) => page.locator('xpath=//*[@id=\'1611\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  page4: (page: Page) => page.locator('xpath=//*[@id=\'1612\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  h1moulis: (page: Page) => page.locator('xpath=//h3[contains(normalize-space(text()),\'1Moulis\')]').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  createEditFormLink: (page: Page) => page.locator('xpath=//*[@id=\'linkBackToForms\']').filter({ visible: true }).first(),
};
