import { test, expect } from '@playwright/test';

test('Recorded flow', async ({ page }) => {
  await page.getByText('Get Started', { exact: false }).first().click();
  await page.waitForLoadState('domcontentloaded');
});