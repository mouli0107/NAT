import { Page } from '@playwright/test';
import { StorageHtmlPageLocators } from '../locators/StorageHtmlPage.locators';

export class StorageHtmlPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(url: string = 'https://117146701.intellimizeio.com/storage.html'): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async selectStorageType(storageType: 'localStorage' | 'sessionStorage' | 'cookies'): Promise<void> {
    const locator = StorageHtmlPageLocators.storageTypeSelect(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.selectOption(storageType);
  }

  async enterKey(key: string): Promise<void> {
    const locator = StorageHtmlPageLocators.keyInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(key);
  }

  async enterValue(value: string): Promise<void> {
    const locator = StorageHtmlPageLocators.valueInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(value);
  }

  async clickSetItem(): Promise<void> {
    const locator = StorageHtmlPageLocators.setItemButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickGetItem(): Promise<void> {
    const locator = StorageHtmlPageLocators.getItemButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickRemoveItem(): Promise<void> {
    const locator = StorageHtmlPageLocators.removeItemButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickClearAll(): Promise<void> {
    const locator = StorageHtmlPageLocators.clearAllButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async getOutputText(): Promise<string> {
    const locator = StorageHtmlPageLocators.outputDisplay(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async getStorageContents(): Promise<string> {
    const locator = StorageHtmlPageLocators.storageContentsDisplay(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async clickShowAll(): Promise<void> {
    const locator = StorageHtmlPageLocators.showAllButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async getPageTitle(): Promise<string> {
    const locator = StorageHtmlPageLocators.pageTitle(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async searchForKey(searchKey: string): Promise<void> {
    const inputLocator = StorageHtmlPageLocators.searchKeyInput(this.page);
    await inputLocator.waitFor({ state: 'visible' });
    await inputLocator.clear();
    await inputLocator.fill(searchKey);
    
    const buttonLocator = StorageHtmlPageLocators.searchButton(this.page);
    await buttonLocator.waitFor({ state: 'visible' });
    await buttonLocator.click();
  }

  async getStatusMessage(): Promise<string> {
    const locator = StorageHtmlPageLocators.statusMessage(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async clickExport(): Promise<void> {
    const locator = StorageHtmlPageLocators.exportButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async importFile(filePath: string): Promise<void> {
    const fileInputLocator = StorageHtmlPageLocators.importFileInput(this.page);
    await fileInputLocator.waitFor({ state: 'attached' });
    await fileInputLocator.setInputFiles(filePath);
    
    const buttonLocator = StorageHtmlPageLocators.importButton(this.page);
    await buttonLocator.waitFor({ state: 'visible' });
    await buttonLocator.click();
  }

  async getStorageTableRowCount(): Promise<number> {
    const locator = StorageHtmlPageLocators.storageTableBody(this.page);
    await locator.waitFor({ state: 'visible' });
    const rows = await locator.locator('xpath=.//tr').count();
    return rows;
  }

  async toggleIncludeTimestamp(checked: boolean): Promise<void> {
    const locator = StorageHtmlPageLocators.includeTimestampCheckbox(this.page);
    await locator.waitFor({ state: 'visible' });
    const isChecked = await locator.isChecked();
    if (isChecked !== checked) {
      await locator.click();
    }
  }

  async setStorageItem(key: string, value: string): Promise<void> {
    await this.enterKey(key);
    await this.enterValue(value);
    await this.clickSetItem();
  }

  async getStorageItem(key: string): Promise<string> {
    await this.enterKey(key);
    await this.clickGetItem();
    return await this.getOutputText();
  }

  async removeStorageItem(key: string): Promise<void> {
    await this.enterKey(key);
    await this.clickRemoveItem();
  }

  async isStorageTableVisible(): Promise<boolean> {
    const locator = StorageHtmlPageLocators.storageTable(this.page);
    return await locator.isVisible();
  }

  async waitForStatusMessage(expectedMessage: string, timeout: number = 5000): Promise<void> {
    const locator = StorageHtmlPageLocators.statusMessage(this.page);
    await locator.waitFor({ state: 'visible', timeout });
    await this.page.waitForFunction(
      (args) => {
        const element = document.querySelector('#statusMessage');
        return element?.textContent?.includes(args.message);
      },
      { message: expectedMessage },
      { timeout }
    );
  }
}