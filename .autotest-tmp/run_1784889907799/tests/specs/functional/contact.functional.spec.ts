import { test, expect } from '@playwright/test';
import { ContactPage } from '../../pages/contact.page';

test.describe('@functional | Contact Us | Artizent', () => {

  test('TC-FUN01 form fields are visible and interactive', async ({ page }) => {
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('#c-name')).toBeVisible();
  });

  test('TC-FUN02 input field accepts text', async ({ page }) => {
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await page.locator('#c-name').fill('test input');
    await expect(page.locator('#c-name')).toHaveValue('test input');
  });

  test('TC-FUN03 submit button is present and enabled', async ({ page }) => {
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeEnabled();
  });
});
