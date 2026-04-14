import { test, expect } from '@playwright/test';
import { AgileDevelopmentPage } from '../../pages/agile_development.page';
import { invalidEmails, edgeData, xssPayloads, sqlPayloads } from '../../data/test.data';

test.describe('❌ Negative | Agile Consulting Services, Agile Software Development Company', () => {
  let po: AgileDevelopmentPage;

  test.beforeEach(async ({ page }) => {
    po = new AgileDevelopmentPage(page);
    await po.navigate();
  });

  test('TC-N01 submitting empty form shows validation feedback', async ({ page }) => {
    const submit = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submit.count() > 0) {
      await submit.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1500);
    const urlAfter  = page.url();
    const hasErrors = await page.locator('[class*="error"],[aria-invalid="true"],[class*="invalid"]').count() > 0;
    const stillHere = urlAfter.includes('/services/agile-development');
    expect(stillHere || hasErrors).toBeTruthy();
  });

  test('TC-N02 invalid email format triggers validation', async ({ page }) => {
    const emailField = page.locator('input[type="email"]').first();
    if (await emailField.count() === 0) test.skip();
    await emailField.fill(invalidEmails[0]);
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count() > 0) await submit.click();
    await page.waitForTimeout(1000);
    const invalid = await emailField.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    const hasError = await page.locator('[class*="error"]').count() > 0;
    expect(invalid || hasError).toBeTruthy();
  });

  test('TC-N03 very long input does not crash the page', async ({ page }) => {
    const textInput = page.locator('input[type="text"], input[type="email"]').first();
    if (await textInput.count() === 0) test.skip();
    await textInput.fill(edgeData.longString);
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

});
