import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators } from '../helpers/universal';

test('Recorded flow', async ({ page, context }) => {
  // ─── Object Repository (auto-captured during recording) ─────────────────
  // Edit locators here — all test steps reference these named variables.
  const L = {
    allowAllCookiesButton: page.locator('xpath=//button[normalize-space(text())=\'Allow all cookies\']').filter({ visible: true }).first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Allow all cookies']
    //  ↳ [relative-structural] xpath: //*[@id='ch2-dialog']//button[normalize-space(text())='Allow all cookies']
    getStartedLink      : page.locator('xpath=//a[normalize-space(text())=\'Get Started\']').filter({ visible: true }).first(),
    //  ↳ [link-text] xpath: //a[normalize-space(text())='Get Started']
    //  ↳ [relative-structural] xpath: //*[@id='p_lt_Header']//a[normalize-space(text())='Get Started']
    searchProductsInput : page.locator('xpath=//*[@id=\'search-input\']').first(),
    //  ↳ [id] xpath: //*[@id='search-input']
    //  ↳ [placeholder] xpath: //input[@placeholder='Search products...']
    //  ↳ [relative-structural] xpath: //*[@id='main-content']//input[@placeholder='Search products...']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @placeholder='Search products...']
    readyapiLink        : page.locator('xpath=//a[normalize-space(text())=\'ReadyAPI\']').first(),
    //  ↳ [link-text] xpath: //a[normalize-space(text())='ReadyAPI']
    //  ↳ [relative-structural] xpath: //*[@id='product-grid']//a[normalize-space(text())='ReadyAPI']
  };

  await page.goto('https://smartbear.com');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://smartbear.com/');
  // Cookie/privacy consent — prepareSite() may have already dismissed this banner
  await L.allowAllCookiesButton.click({ timeout: 5000 }).catch(() => {});
  await L.getStartedLink.click();
  await page.waitForURL('**https://smartbear.com/product/');
  await L.searchProductsInput.fill('api');
  await L.readyapiLink.click();
  await page.waitForURL('**https://smartbear.com/product/ready-api/');
});