import { Page, Locator } from '@playwright/test';

export const StorageHtmlPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //select[@name='storageType']
  storageTypeSelect: (page: Page): Locator => page.locator("xpath=//select[@id='storageType']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Enter key']
  keyInput: (page: Page): Locator => page.locator("xpath=//input[@id='key']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@placeholder='Enter value']
  valueInput: (page: Page): Locator => page.locator("xpath=//input[@id='value']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Set Item']
  setItemButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='set-item-btn']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Get Item']
  getItemButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='get-item-btn']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Remove Item']
  removeItemButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='remove-item-btn']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Clear All']
  clearAllButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='clear-all-btn']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //div[@class='output']
  outputDisplay: (page: Page): Locator => page.locator("xpath=//*[@id='output']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //div[@class='storage-contents']
  storageContentsDisplay: (page: Page): Locator => page.locator("xpath=//*[@id='storageContents']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Show All']
  showAllButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='show-all-btn']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //h1[contains(text(),'Storage')]
  pageTitle: (page: Page): Locator => page.locator("xpath=//h1[@id='page-title']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@name='searchKey']
  searchKeyInput: (page: Page): Locator => page.locator("xpath=//input[@id='searchKey']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Search']
  searchButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='search-btn']"),
  
  // Uniqueness: likely unique | Stability: stable | Fallback: //span[@class='status-message']
  statusMessage: (page: Page): Locator => page.locator("xpath=//*[@id='statusMessage']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Export']
  exportButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='export-btn']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='file']
  importFileInput: (page: Page): Locator => page.locator("xpath=//input[@id='importFile']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[normalize-space(text())='Import']
  importButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='import-btn']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //table[@class='storage-table']
  storageTable: (page: Page): Locator => page.locator("xpath=//table[@id='storageTable']"),
  
  // Uniqueness: verify | Stability: fragile — dynamic content | Fallback: //tbody[@class='storage-body']
  storageTableBody: (page: Page): Locator => page.locator("xpath=//table[@id='storageTable']//tbody"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='checkbox' and @name='includeTimestamp']
  includeTimestampCheckbox: (page: Page): Locator => page.locator("xpath=//input[@id='includeTimestamp']"),
  setButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='set-storage-btn']"),
  getButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='get-storage-btn']"),
  removeButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='remove-storage-btn']"),
  clearButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='clear-storage-btn']"),
  storageDisplay: (page: Page): Locator => page.locator("xpath=//*[@id='storageDisplay']"),
  storageTypeSelector: (page: Page): Locator => page.locator("xpath=//select[@id='storageType']"),
  localStorageRadio: (page: Page): Locator => page.locator("xpath=//input[@name='storageType' and @value='localStorage']"),
  sessionStorageRadio: (page: Page): Locator => page.locator("xpath=//input[@name='storageType' and @value='sessionStorage']"),
  resultMessage: (page: Page): Locator => page.locator("xpath=//*[@id='resultMessage']"),
  fileUploadInput: (page: Page): Locator => page.locator("xpath=//input[@name='storageFile']"),
  storageItemCount: (page: Page): Locator => page.locator("xpath=//*[@id='itemCount']"),
};
