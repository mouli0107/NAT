import { Page } from '@playwright/test';

export const CustomerAdditionPageLocators = (page: Page) => ({
  langRadioEnglish: page.locator("xpath=//*[@id='lang-rad-E']").filter({ visible: true }).first(),
  titleSelect:      page.locator("xpath=//*[@id='add-title']").filter({ visible: true }).first(),
  firstNameInput:   page.locator("xpath=//*[@id='add-f-n']").filter({ visible: true }).first(),
  lastNameInput:    page.locator("xpath=//input[@name='lname']").filter({ visible: true }).first(),
  dateOfBirthInput: page.locator("xpath=//*[@id='dateOfBirth']").filter({ visible: true }).first(),
  phoneNumberInput: page.locator("xpath=//*[@id='phone_number_0']").filter({ visible: true }).first(),
  emailInput:       page.locator("xpath=//*[@id='email_id_0']").filter({ visible: true }).first(),

  // CSS text-transform: uppercase — DOM text may be "Save" not "SAVE"
  saveButton: page.locator(
    "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'save')]"
  ).filter({ visible: true }).first(),
});
