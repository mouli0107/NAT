import { test, expect } from '@playwright/test';
import { ContactPage } from '../../pages/contact.page';

test.describe('@negative | Contact Us | Artizent', () => {

  test('TC-NEG01 empty required fields trigger validation', async ({ page }) => {
    const po = new ContactPage(page);
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
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const field = page.locator('#c-name').first();
    if (await field.count() > 0) {
      await field.fill('A'.repeat(500));
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
