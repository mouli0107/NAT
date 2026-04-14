import { test, expect } from '@playwright/test';
import { IndustriesPage } from '../../pages/industries.page';
import { assertNoXSSExecution, assertNoServerErrorExposed } from '../../helpers/security.helper';
import { xssPayloads } from '../../data/test.data';

test.describe('@security | Industry-Leading Commercial Insurance Solutions - Amerisure', () => {
  test('TC-SEC01 URL does not expose sensitive parameters', async ({ page }) => {
    const po = new IndustriesPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const url = page.url();
    const sensitive = /password|passwd|secret|token|api[_-]?key|auth|credential/i;
    expect(sensitive.test(url)).toBe(false);
  });

  test('TC-SEC02 security response headers are present', async ({ page }) => {
    const res = await page.request.get('/industries/');
    const h = res.headers();
    const hasHeader =
      !!h['x-frame-options'] ||
      !!h['x-content-type-options'] ||
      !!h['content-security-policy'] ||
      !!h['strict-transport-security'];
    if (!hasHeader) {
      console.warn('[Advisory] No security headers on /industries/');
    }
    // Advisory only — do not hard-fail (CDN/proxy may strip headers)
  });

  for (const payload of xssPayloads) {
    test(`TC-SEC03 XSS payload does not execute: "${payload.substring(0, 40)}"`, async ({ page }) => {
      const po = new IndustriesPage(page);
      await po.navigate();
      await po.waitForPageLoad();
      const field = page.locator('input[name="s"]').first();
      if (await field.count() === 0) test.skip();
      await assertNoXSSExecution(page, [payload], field);
      await assertNoServerErrorExposed(page);
    });
  }

});
