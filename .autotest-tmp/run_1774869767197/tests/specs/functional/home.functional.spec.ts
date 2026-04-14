import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';

test.describe('@functional | Commercial Insurance Solutions - Amerisure', () => {

  test('TC-FUN01 form fields are visible and interactive', async ({ page }) => {
    const po = new HomePage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('input[name="s"]')).toBeVisible();
  });

  test('TC-FUN02 input field accepts text', async ({ page }) => {
    const po = new HomePage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await page.locator('input[name="s"]').fill('test input');
    await expect(page.locator('input[name="s"]')).toHaveValue('test input');
  });

  test('TC-FUN03 submit button is present and enabled', async ({ page }) => {
    const po = new HomePage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });
});
