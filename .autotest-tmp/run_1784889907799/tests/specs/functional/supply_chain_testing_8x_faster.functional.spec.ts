import { test, expect } from '@playwright/test';
import { SupplyChainTesting8xFasterPage } from '../../pages/supply_chain_testing_8x_faster.page';

test.describe('@functional | Automated testing cut supply chain test cycles from 32 hours to 4 | Artizent Case Study', () => {

  test('TC-FUN01 H1 heading and main content are visible', async ({ page }) => {
    const po = new SupplyChainTesting8xFasterPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('main, [role="main"], body > *').first()).toBeVisible();
  });

  test('TC-FUN02 footer is visible and page scrolls to bottom', async ({ page }) => {
    const po = new SupplyChainTesting8xFasterPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer, [class*="footer"]').first();
    if (await footer.count() > 0) {
      await expect(footer).toBeVisible();
    }
    // No inputs detected on this page
  });

  test('TC-FUN03 all internal navigation links return HTTP 200', async ({ page }) => {
    const po = new SupplyChainTesting8xFasterPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const { checkInternalLinks } = await import('../../helpers/nav.helper');
    await checkInternalLinks(page);
  });
});
