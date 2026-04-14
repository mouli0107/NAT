import { Page } from '@playwright/test';

export const LandingPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  aishuLince: (page: Page) => page.locator('xpath=//*[@id=\'ApplicantGrid\']//div').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  davidHall: (page: Page) => page.locator('xpath=//*[@id=\'ApplicantGrid\']//div').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  viewEditButton: (page: Page) => page.locator('xpath=//*[@id=\'btn_310\']').filter({ visible: true }).first(),
};
