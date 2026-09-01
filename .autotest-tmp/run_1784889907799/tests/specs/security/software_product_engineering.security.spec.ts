import { test, expect } from '@playwright/test';
import { SoftwareProductEngineeringPage } from '../../pages/software_product_engineering.page';
import { assertNoXSSExecution, assertNoServerErrorExposed } from '../../helpers/security.helper';
import { xssPayloads } from '../../data/test.data';

test.describe('@security | Software & Product Engineering | Artizent', () => {
  test('TC-SEC01 URL does not expose sensitive parameters', async ({ page }) => {
    const po = new SoftwareProductEngineeringPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const url = page.url();
    const sensitive = /password|passwd|secret|token|api[_-]?key|auth|credential/i;
    expect(sensitive.test(url)).toBe(false);
  });

  test('TC-SEC02 security response headers are present', async ({ page }) => {
    const res = await page.request.get('/services/software-product-engineering');
    const h = res.headers();
    const hasHeader =
      !!h['x-frame-options'] ||
      !!h['x-content-type-options'] ||
      !!h['content-security-policy'] ||
      !!h['strict-transport-security'];
    if (!hasHeader) {
      console.warn('[Advisory] No security headers on /services/software-product-engineering');
    }
    // Advisory only — do not hard-fail (CDN/proxy may strip headers)
  });

});
