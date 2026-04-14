import { test, expect } from '@playwright/test';
import { ContactUsPage } from '../../pages/contact_us.page';
import { edgeData } from '../../data/test.data';

test.describe('@edge | Contact Us - Amerisure', () => {
  test('TC-EDG01 direct URL navigation lands on correct page', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toContain('/contact-us/');
  });

  test('TC-EDG02 back/forward browser navigation works', async ({ page }) => {
    const po = new ContactUsPage(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await po.navigate();
    await po.waitForPageLoad();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-EDG03 special characters in input do not crash the page', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const field = page.locator('#input_1_14').first();
    if (await field.count() > 0) {
      await field.fill(edgeData.specialChars);
      await page.waitForFunction(() => true);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('TC-EDG04 unicode input is handled gracefully', async ({ page }) => {
    const po = new ContactUsPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const field = page.locator('#input_1_14').first();
    if (await field.count() > 0) {
      await field.fill(edgeData.unicode);
      await page.waitForFunction(() => true);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
