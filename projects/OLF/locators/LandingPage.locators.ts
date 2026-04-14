import { Page } from '@playwright/test';

export const LandingPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  joeRogan: (page: Page) => page.locator('xpath=//*[@id=\'ApplicantGrid\']//span').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  btn126Button: (page: Page) => page.locator('xpath=//*[@id=\'btn_126\']').filter({ visible: true }).first(),
};
