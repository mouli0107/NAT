import { test, expect } from '@playwright/test';
import { FileAClaimPage } from '../../pages/file_a_claim.page';

test.describe('@smoke | File a Claim - Amerisure', () => {
  test('TC-SMK01 page returns HTTP 2xx status', async ({ page }) => {
    const po = new FileAClaimPage(page);
    const res = await page.request.get('/file-a-claim/');
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(400);
  });

  test('TC-SMK02 body is visible and contains text', async ({ page }) => {
    const po = new FileAClaimPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(10);
  });

  test('TC-SMK03 no critical JavaScript runtime errors on load', async ({ page }) => {
    const po = new FileAClaimPage(page);
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await po.navigate();
    await po.waitForPageLoad();
    await page.waitForLoadState('domcontentloaded');
    const jsErrors = errors.filter(e =>
      (e.includes('TypeError') || e.includes('ReferenceError') || e.includes('SyntaxError') || e.includes('Uncaught'))
      && !e.includes('Failed to load resource') && !e.includes('net::ERR')
    );
    expect(jsErrors, 'JS runtime errors: ' + jsErrors.join(' | ')).toHaveLength(0);
  });
});
