import { Page } from '@playwright/test';

export const LoadFormPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  btnsubmitapplicantformButton: (page: Page) => page.locator('xpath=//*[@id=\'btnSubmitApplicantForm\']').filter({ visible: true }).first(),
};
