import { Page, Locator } from '@playwright/test';

export const AutomationPracticeFormPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='First Name']
  firstNameInput: (page: Page): Locator => page.locator("xpath=//input[@id='firstName']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Last Name']
  lastNameInput: (page: Page): Locator => page.locator("xpath=//input[@id='lastName']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='name@example.com']
  emailInput: (page: Page): Locator => page.locator("xpath=//input[@id='userEmail']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //label[normalize-space(text())='Male']/preceding-sibling::input[@type='radio']
  maleRadioButton: (page: Page): Locator => page.locator("xpath=//input[@id='gender-radio-1']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //label[normalize-space(text())='Female']/preceding-sibling::input[@type='radio']
  femaleRadioButton: (page: Page): Locator => page.locator("xpath=//input[@id='gender-radio-2']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //label[normalize-space(text())='Other']/preceding-sibling::input[@type='radio']
  otherRadioButton: (page: Page): Locator => page.locator("xpath=//input[@id='gender-radio-3']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //label[normalize-space(text())='Male']
  maleRadioLabel: (page: Page): Locator => page.locator("xpath=//label[@for='gender-radio-1']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Mobile Number']
  mobileNumberInput: (page: Page): Locator => page.locator("xpath=//input[@id='userNumber']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@id='dateOfBirthInput']
  dateOfBirthInput: (page: Page): Locator => page.locator("xpath=//input[@id='dateOfBirthInput']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //div[@class='subjects-auto-complete__value-container']//input
  subjectsInput: (page: Page): Locator => page.locator("xpath=//input[@id='subjectsInput']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //label[normalize-space(text())='Sports']/preceding-sibling::input[@type='checkbox']
  sportsCheckbox: (page: Page): Locator => page.locator("xpath=//input[@id='hobbies-checkbox-1']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //label[normalize-space(text())='Sports']
  sportsCheckboxLabel: (page: Page): Locator => page.locator("xpath=//label[@for='hobbies-checkbox-1']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //label[normalize-space(text())='Reading']/preceding-sibling::input[@type='checkbox']
  readingCheckbox: (page: Page): Locator => page.locator("xpath=//input[@id='hobbies-checkbox-2']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //label[normalize-space(text())='Reading']
  readingCheckboxLabel: (page: Page): Locator => page.locator("xpath=//label[@for='hobbies-checkbox-2']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //label[normalize-space(text())='Music']/preceding-sibling::input[@type='checkbox']
  musicCheckbox: (page: Page): Locator => page.locator("xpath=//input[@id='hobbies-checkbox-3']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //textarea[@placeholder='Current Address']
  currentAddressTextarea: (page: Page): Locator => page.locator("xpath=//textarea[@id='currentAddress']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //div[@id='state']//input
  stateDropdownInput: (page: Page): Locator => page.locator("xpath=//div[@id='state']//input"),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //div[@id='state']//div[contains(@class, 'control')]
  stateDropdownContainer: (page: Page): Locator => page.locator("xpath=//div[@id='state']"),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //div[contains(@class, 'option') and normalize-space(text())='NCR']
  stateOption: (page: Page, stateName: string): Locator => page.locator(`xpath=//div[contains(@id, 'react-select') and contains(@id, 'option') and normalize-space(text())='${stateName}']`),
  
  // Uniqueness: unique | Stability: stable | Fallback: //div[@id='city']//input
  cityDropdownInput: (page: Page): Locator => page.locator("xpath=//div[@id='city']//input"),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //div[@id='city']//div[contains(@class, 'control')]
  cityDropdownContainer: (page: Page): Locator => page.locator("xpath=//div[@id='city']"),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //div[contains(@class, 'option') and normalize-space(text())='Delhi']
  cityOption: (page: Page, cityName: string): Locator => page.locator(`xpath=//div[contains(@id, 'react-select') and contains(@id, 'option') and normalize-space(text())='${cityName}']`),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Submit']
  submitButton: (page: Page): Locator => page.locator("xpath=//button[@id='submit']"),
  
  // Uniqueness: verify | Stability: fragile — success message content may vary | Fallback: //div[@class='modal-header']
  successMessage: (page: Page): Locator => page.locator("xpath=//div[@id='example-modal-sizes-title-lg']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //div[contains(@class, 'modal-content')]
  modalContent: (page: Page): Locator => page.locator("xpath=//div[contains(@class, 'modal-content')]"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h1[normalize-space(text())='Practice Form']
  pageHeading: (page: Page): Locator => page.locator("xpath=//h1[normalize-space(text())='Practice Form']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //h5[normalize-space(text())='Student Registration Form']
  formHeading: (page: Page): Locator => page.locator("xpath=//h5[normalize-space(text())='Student Registration Form']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //div[@class='react-datepicker__month-select']
  datePickerMonthSelect: (page: Page): Locator => page.locator("xpath=//select[@class='react-datepicker__month-select']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //div[@class='react-datepicker__year-select']
  datePickerYearSelect: (page: Page): Locator => page.locator("xpath=//select[@class='react-datepicker__year-select']"),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //div[contains(@class, 'react-datepicker__day') and not(contains(@class, 'outside-month'))]
  datePickerDay: (page: Page, day: string): Locator => page.locator(`xpath=//div[contains(@class, 'react-datepicker__day') and not(contains(@class, 'outside-month')) and normalize-space(text())='${day}']`)
};