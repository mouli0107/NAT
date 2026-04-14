import { Page } from '@playwright/test';

export function CreateEditFormsPageLocators(page: Page) {
  return {
    addNewFormButton: page.locator('#btnNewForm').first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Add New Form']

    nextButton: page.locator('#btnSelectFormCreationNext').first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='NEXT']

    sendButton: page.locator('button:has-text("Send")').first(),
    //  ↳ Send button on form row → navigates to SendGenericForm
  };
}

export type CreateEditFormsPageLocatorMap = ReturnType<typeof CreateEditFormsPageLocators>;
