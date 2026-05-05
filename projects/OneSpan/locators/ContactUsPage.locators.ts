import { Page, Locator } from '@playwright/test';

export const ContactUsPageLocators = {
  // Uniqueness: unique within scoped nav | Stability: stable | Fallback: //a[@href="/products/request-a-demo"]
  requestDemoLink: (page: Page): Locator => page.locator('xpath=//nav[@aria-label="Main header call to action buttonsw"]//a[normalize-space(text())="Request demo"]'),
};