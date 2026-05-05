import { Page, Locator } from '@playwright/test';

/**
 * Object Repository — AutomationPracticeForm (demoqa.com/automation-practice-form)
 * Single source of truth for all element selectors on this page.
 * Each property is a factory function: (page: Page): Locator
 */
export const AutomationPracticeFormPageLocators = {

  // ── Personal Info ──────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='First Name']
  firstNameInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='firstName']"),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Last Name']
  lastNameInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='lastName']"),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='email']
  emailInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='userEmail']"),

  // Uniqueness: unique | Stability: stable — scoped to gender radio group
  // Fallback: //label[normalize-space(text())='Male']
  maleRadio: (page: Page): Locator =>
    page.locator("xpath=//label[@for='gender-radio-1']"),

  femaleRadio: (page: Page): Locator =>
    page.locator("xpath=//label[@for='gender-radio-2']"),

  otherRadio: (page: Page): Locator =>
    page.locator("xpath=//label[@for='gender-radio-3']"),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Mobile Number']
  mobileInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='userNumber']"),

  // ── Date of Birth ──────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable | Fallback: //div[contains(@class,'datePicker')]//input
  dateOfBirthInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='dateOfBirthInput']"),

  // Uniqueness: unique | Stability: stable — month/year selects inside datepicker
  datePickerMonthSelect: (page: Page): Locator =>
    page.locator("xpath=//select[contains(@class,'month-select')]"),

  datePickerYearSelect: (page: Page): Locator =>
    page.locator("xpath=//select[contains(@class,'year-select')]"),

  // ── Subjects ──────────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Type to search']
  subjectsInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='subjectsInput']"),

  // First matching subject option in the autocomplete dropdown
  // Uniqueness: verify | Stability: stable | Fallback: //div[contains(@class,'option')]
  subjectsFirstOption: (page: Page): Locator =>
    page.locator("xpath=//div[contains(@class,'subjects-auto-complete__option')][1]"),

  // ── Hobbies ───────────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable — label-based checkboxes
  sportsCheckbox: (page: Page): Locator =>
    page.locator("xpath=//label[@for='hobbies-checkbox-1']"),

  readingCheckbox: (page: Page): Locator =>
    page.locator("xpath=//label[@for='hobbies-checkbox-2']"),

  musicCheckbox: (page: Page): Locator =>
    page.locator("xpath=//label[@for='hobbies-checkbox-3']"),

  // ── Upload ────────────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='file']
  uploadPictureInput: (page: Page): Locator =>
    page.locator("xpath=//input[@id='uploadPicture']"),

  // ── Address & Location ────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable | Fallback: //textarea[@placeholder='Current Address']
  currentAddressInput: (page: Page): Locator =>
    page.locator("xpath=//textarea[@id='currentAddress']"),

  // Uniqueness: unique | Stability: stable — react-select wrapper
  stateDropdown: (page: Page): Locator =>
    page.locator("xpath=//div[@id='state']"),

  cityDropdown: (page: Page): Locator =>
    page.locator("xpath=//div[@id='city']"),

  // Generic react-select option — used for both state and city
  // Uniqueness: verify | Stability: stable | Fallback: //*[contains(@class,'option') and text()='VALUE']
  reactSelectOption: (page: Page, value: string): Locator =>
    page.locator(`xpath=//div[contains(@class,'option') and normalize-space(text())='${value}']`),

  // ── Submit ────────────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable | Fallback: //button[@type='submit']
  submitButton: (page: Page): Locator =>
    page.locator("xpath=//button[@id='submit']"),

  // ── Success Modal ─────────────────────────────────────────────────────────

  // Uniqueness: unique | Stability: stable — modal title text
  successModalTitle: (page: Page): Locator =>
    page.locator("xpath=//div[@id='example-modal-sizes-title-lg']"),

  // Uniqueness: unique | Stability: stable — confirmation table
  successModalTable: (page: Page): Locator =>
    page.locator("xpath=//table[contains(@class,'table-responsive')]"),

  // Close button on the success modal
  successModalCloseButton: (page: Page): Locator =>
    page.locator("xpath=//button[@id='closeLargeModal']"),
};
