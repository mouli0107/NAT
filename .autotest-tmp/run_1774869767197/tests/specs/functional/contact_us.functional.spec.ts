import { test, expect } from '@playwright/test';
import { ContactUsPage } from '../../pages/contact_us.page';

test.describe('@functional | Contact Us - Amerisure', () => {

  test('TC-FUN01 form fields are visible and interactive', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('#input_1_14')).toBeVisible();
  });

  test('TC-FUN02 input field accepts text', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await page.locator('#input_1_14').fill('test input');
    await expect(page.locator('#input_1_14')).toHaveValue('test input');
  });

  test('TC-FUN03 submit button is present and enabled', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeEnabled();
  });
});
