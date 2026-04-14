import { Page } from '@playwright/test';

export function SendGenericFormPageLocators(page: Page) {
  return {
    recipientCheckboxFirst: page.locator('table tbody tr input[type="checkbox"]').first(),
    //  ↳ First recipient checkbox in the grid

    sendEmailButton: page.locator('button:has-text("SEND EMAIL"), #btnSendEmail').first(),
    //  ↳ Green "SEND EMAIL" button at the bottom of the page

    composeWindow: page.locator('.k-widget.k-window, .k-window').first(),
    //  ↳ Kendo Window — email compose modal

    toField: page.locator('#txtTo'),
    //  ↳ To email input inside the compose window

    btnSend: page.locator('#btnSend'),
    //  ↳ Send button inside the compose window

    popupOkButton: page.locator('button:has-text("OK"), button:has-text("DONE"), button:has-text("EXIT")').first(),
    //  ↳ Dismiss button on confirmation popup
  };
}

export type SendGenericFormPageLocatorMap = ReturnType<typeof SendGenericFormPageLocators>;
