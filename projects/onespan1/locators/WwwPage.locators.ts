import { Page } from '@playwright/test';

export const WwwPageLocators = {
  // Uniqueness: verify | Stability: stable — XPath locator | Fallback: see all strategies in object repository
  fidoHardwareAuthenticatorsStLink: (page: Page) => page.locator('xpath=//a[@aria-label=\'FIDO Hardware Authenticators Stop account takeover with a phishing resistant, passwordless solution that enables faster logins\']').filter({ visible: true }).first(),
};
