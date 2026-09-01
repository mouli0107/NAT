import { Page } from '@playwright/test';

export const EngineeringPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  businessOptimizationButton: (page: Page) => page.locator('xpath=//button[normalize-space(text())=\'Business Optimization\']').filter({ visible: true }).first(),
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  controlCostsLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'Control Costs\']').filter({ visible: true }).first(),
};
