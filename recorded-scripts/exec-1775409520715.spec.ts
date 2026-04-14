import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators } from '../helpers/universal';

test('Recorded flow', async ({ page, context }) => {
  // ─── Object Repository (auto-captured during recording) ─────────────────
  // Edit locators here — all test steps reference these named variables.
  const L = {
    rewardsOffersLink   : page.locator('xpath=//a[normalize-space(text())=\'Rewards & Offers\']'),
    //  ↳ [relative-structural] xpath: //*[@id='global-navigation-header']//a[normalize-space(text())='Rewards & Offers']
  };

  await page.goto('https://pg.com');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://us.pg.com/');
  await L.rewardsOffersLink.click();
});