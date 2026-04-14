import { test, expect } from '@playwright/test';

test('Recorded flow', async ({ page }) => {
  await page.getByRole('link', { name: 'Home', exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.getByText('Webinars', { exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('link', { name: 'Home', exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('link', { name: 'Contact', exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await page.getByText('Sales Team', { exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
});