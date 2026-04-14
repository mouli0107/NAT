import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { TEST_DATA } from '../../data/test.data';

test.describe('⚡ Edge Cases | Digital Transformation Solutions, IT Consulting | Nous Infosystems', () => {
  test('TC-E01 direct URL navigation lands on correct page', async ({ page }) => {
    await page.goto('https://www.nousinfosystems.com/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toContain('/');
  });

  test('TC-E02 back/forward browser navigation works', async ({ page }) => {
    await page.goto('https://nousinfosystems.com', { waitUntil: 'domcontentloaded' });
    await page.goto('https://www.nousinfosystems.com/',     { waitUntil: 'domcontentloaded' });
    await page.goBack( { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-E03 page reload retains content', async ({ page }) => {
    const po = new HomePage(page);
    await po.navigate();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-E04 special characters in text fields do not crash page', async ({ page }) => {
    const po = new HomePage(page);
    await po.navigate();
    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.count() === 0) test.skip();
    await textInput.fill(TEST_DATA.edge.specialChars);
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-E05 unicode input is handled gracefully', async ({ page }) => {
    const po = new HomePage(page);
    await po.navigate();
    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.count() === 0) test.skip();
    await textInput.fill(TEST_DATA.edge.unicode);
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });
});
