import { Page } from '@playwright/test';

export const CLSCONSTRUCTIONEXOSKELETONSPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  exoSShoulderExoskeletonLink: (page: Page) => page.locator('xpath=//a[normalize-space(text())=\'EXO-S Shoulder Exoskeleton\']').filter({ visible: true }).first(),
};
