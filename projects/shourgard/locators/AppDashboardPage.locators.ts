import { Page, Locator } from '@playwright/test';

export const AppDashboardPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="text" and contains(@placeholder,"Username")]
  usernameInput: (page: Page): Locator => page.locator('xpath=//input[@id="exampleInputEmail1"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type="password"]
  passwordInput: (page: Page): Locator => page.locator('xpath=//input[@id="exampleInputPassword1"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //button[contains(normalize-space(text()),"Belgium")]
  belgiumButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"Belgium")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //button[@type="button" and contains(text(),"001")]
  store001Button: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"001")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder="First Name"]
  firstNameInput: (page: Page): Locator => page.locator('xpath=//input[@name="fname"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //select[contains(@name,"CustomerType")]
  customerTypeDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="selectCustomerType"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //button[@type="submit" and contains(text(),"SEARCH")]
  searchButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"SEARCH")]'),
  
  // Uniqueness: verify | Stability: fragile - name based | Fallback: //a[@href="/customer-management/customer-information/9378117"]
  harshJoshiLink: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Harsh Joshi")]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //a[@href and contains(text(),"Inquiry")]
  inquiry1Link: (page: Page): Locator => page.locator('xpath=//a[contains(normalize-space(text()),"Inquiry 1")]'),
  
  // Uniqueness: verify | Stability: fragile - date specific | Fallback: //button[@type="button" and contains(@aria-label,"27-04-2026")]
  dateButton27042026: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"27-04-2026")]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder="dd-mm-yyyy"]
  needDateInput: (page: Page): Locator => page.locator('xpath=//input[@name="NeedDate"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //select[contains(@name,"Why")]
  inquiryWhyDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="inquiryWhy"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name="inquiry-why"]
  inquiryWhyInput: (page: Page): Locator => page.locator('xpath=//input[@id="inquiry-why"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //textarea[contains(@placeholder,"What")]
  editWhatTextarea: (page: Page): Locator => page.locator('xpath=//textarea[@name="editWhat"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //select[contains(@name,"Objection")]
  inquiryObjectionDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="inquiryObjection"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name="inquiry-Objection"]
  inquiryObjectionInput: (page: Page): Locator => page.locator('xpath=//input[@id="inquiry-Objection"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //select[contains(@name,"OCObjection")]
  inquiryOCObjectionDropdown: (page: Page): Locator => page.locator('xpath=//select[@id="inquiryOCObjection"]'),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name="inquiry-OCObjection"]
  inquiryOCObjectionInput: (page: Page): Locator => page.locator('xpath=//input[@id="inquiry-OCObjection"]'),
  
  // Uniqueness: verify | Stability: stable | Fallback: //button[@type="submit" and contains(text(),"SAVE")]
  saveButton: (page: Page): Locator => page.locator('xpath=//button[contains(normalize-space(text()),"SAVE")]')
};