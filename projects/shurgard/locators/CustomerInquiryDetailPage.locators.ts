import { Page } from '@playwright/test';

export const CustomerInquiryDetailPageLocators = (page: Page) => ({
  // Need Date — date input (format dd-mm-yyyy)
  needDateInput: page.locator("xpath=//input[@name='NeedDate']").filter({ visible: true }).first(),

  // Why — reason dropdown (select#inquiryWhy) + detail text input (input#inquiry-why)
  inquiryWhySelect: page.locator("xpath=//select[@id='inquiryWhy']").filter({ visible: true }).first(),
  inquiryWhyInput:  page.locator("xpath=//input[@id='inquiry-why']").filter({ visible: true }).first(),

  // Edit What — free-text textarea
  editWhatTextarea: page.locator("xpath=//textarea[@name='editWhat']").filter({ visible: true }).first(),

  // Objection — dropdown + detail input
  inquiryObjectionSelect: page.locator("xpath=//select[@id='inquiryObjection']").filter({ visible: true }).first(),
  inquiryObjectionInput:  page.locator("xpath=//input[@id='inquiry-Objection']").filter({ visible: true }).first(),

  // OC Objection — dropdown + detail input
  inquiryOCObjectionSelect: page.locator("xpath=//select[@id='inquiryOCObjection']").filter({ visible: true }).first(),
  inquiryOCObjectionInput:  page.locator("xpath=//input[@id='inquiry-OCObjection']").filter({ visible: true }).first(),

  // Save button
  saveButton: page.locator(
    "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'save')]"
  ).filter({ visible: true }).first(),
});
