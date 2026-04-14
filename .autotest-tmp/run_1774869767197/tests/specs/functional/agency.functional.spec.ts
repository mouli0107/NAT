import { test, expect } from '@playwright/test';
import { AgencyPage } from '../../pages/agency.page';

test.describe('@functional | Find an Agency - Amerisure', () => {

  test('TC-FUN01 form fields are visible and interactive', async ({ page }) => {
    const po = new AgencyPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
  });

  test('TC-FUN02 input field accepts text', async ({ page }) => {
    const po = new AgencyPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await page.locator('input[type="checkbox"]').fill('test input');
    await expect(page.locator('input[type="checkbox"]')).toHaveValue('test input');
  });

  test('TC-FUN03 submit button is present and enabled', async ({ page }) => {
    const po = new AgencyPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });
});
