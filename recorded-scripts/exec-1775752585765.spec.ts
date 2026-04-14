import { test, expect } from '@playwright/test';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators, smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

test('Recorded flow', async ({ page, context }) => {
  await page.goto('https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE', { waitUntil: 'domcontentloaded' });
});