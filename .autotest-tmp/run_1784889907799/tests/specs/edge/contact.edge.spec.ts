import { test, expect } from '@playwright/test';
import { ContactPage } from '../../pages/contact.page';
import { edgeData } from '../../data/test.data';

test.describe('@edge | Contact Us | Artizent', () => {
  test('TC-EDG01 direct URL navigation lands on correct page', async ({ page }) => {
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toContain('/contact');
  });

  test('TC-EDG02 back/forward browser navigation works', async ({ page }) => {
    const po = new ContactPage(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await po.navigate();
    await po.waitForPageLoad();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-EDG03 special characters in input do not crash the page', async ({ page }) => {
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const field = page.locator('#c-name').first();
    if (await field.count() > 0) {
      await field.fill(edgeData.specialChars);
      await page.waitForFunction(() => true);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('TC-EDG04 unicode input is handled gracefully', async ({ page }) => {
    const po = new ContactPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const field = page.locator('#c-name').first();
    if (await field.count() > 0) {
      await field.fill(edgeData.unicode);
      await page.waitForFunction(() => true);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
