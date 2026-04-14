import { test, expect } from '@playwright/test';

test('Recorded flow', async ({ page }) => {
  await page.goto('https://healthasyst.com');
  await page.waitForLoadState('domcontentloaded');

  await page.getByText('Menu', { exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.getByText('Manual QA', { exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
});