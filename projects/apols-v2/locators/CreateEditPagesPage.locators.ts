import { Page } from '@playwright/test';

export function CreateEditPagesPageLocators(page: Page) {
  return {
    publishButton: page.locator('#btnPublishForms, button:has-text("Publish"), a:has-text("Publish")').first(),
    //  ↳ Publish button on CreateEditPages page

    doneButton: page.locator('button:has-text("Done"), button:has-text("DONE"), #okButton').first(),
    //  ↳ Done/OK button on confirmation popup after publishing
  };
}

export type CreateEditPagesPageLocatorMap = ReturnType<typeof CreateEditPagesPageLocators>;
