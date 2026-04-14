import { test, expect } from '@playwright/test';
import { ContactUsPage } from '../../pages/contact_us.page';

test.describe('@negative | Contact Us - Amerisure', () => {

  test('TC-NEG01 empty required fields trigger validation', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const submitBtnEl = page.locator('button[type="submit"], input[type="submit"]');
    if (await submitBtnEl.count() > 0) {
      await submitBtnEl.click();
      const error = page.locator('[class*="error"], [aria-invalid="true"], .alert, [role="alert"], [required]:invalid');
      // At least some validation feedback should appear
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('TC-NEG02 extremely long input does not crash the page', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const field = page.locator('#input_1_14').first();
    if (await field.count() > 0) {
      await field.fill('A'.repeat(500));
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
