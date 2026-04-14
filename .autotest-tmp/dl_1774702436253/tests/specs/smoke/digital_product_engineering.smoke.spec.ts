import { test, expect } from '@playwright/test';
import { DigitalProductEngineeringPage } from '../../pages/digital_product_engineering.page';

test.describe('🔥 Smoke | Digital Product Engineering Services, Product Engineering Company', () => {
  let po: DigitalProductEngineeringPage;

  test.beforeEach(async ({ page }) => {
    po = new DigitalProductEngineeringPage(page);
    await po.navigate();
  });

  test('TC-S01 page loads with HTTP 2xx and non-empty title', async ({ page }) => {
    const response = await page.request.get('https://www.nousinfosystems.com/services/digital-product-engineering');
    expect(response.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test('TC-S02 body is visible and contains text', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(0);
  });

  test('TC-S03 no critical JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await po.navigate();
    await page.waitForTimeout(1500);
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('analytics') && !e.includes('gtag'),
    );
    expect(critical).toHaveLength(0);
  });

  test('TC-S04 no broken images', async ({ page }) => {
    const images = page.locator('img');
    const count  = await images.count();
    const broken: string[] = [];
    for (let i = 0; i < Math.min(count, 15); i++) {
      const src = await images.nth(i).getAttribute('src') ?? '';
      if (src.startsWith('data:')) continue;
      const ok = await images.nth(i).evaluate(
        (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      );
      if (!ok && src) broken.push(src.split('/').pop() ?? src);
    }
    expect(broken).toHaveLength(0);
  });
});
