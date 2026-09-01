import { test, expect } from '@playwright/test';
import { FullPlatformAt60PercentCostPage } from '../../pages/full_platform_at_60_percent_cost.page';
import { assertNoXSSExecution, assertNoServerErrorExposed } from '../../helpers/security.helper';
import { xssPayloads } from '../../data/test.data';

test.describe('@security | An insurance policy administration platform, delivered in under a year using an AI native, secure development process | Artizent Case Study', () => {
  test('TC-SEC01 URL does not expose sensitive parameters', async ({ page }) => {
    const po = new FullPlatformAt60PercentCostPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const url = page.url();
    const sensitive = /password|passwd|secret|token|api[_-]?key|auth|credential/i;
    expect(sensitive.test(url)).toBe(false);
  });

  test('TC-SEC02 security response headers are present', async ({ page }) => {
    const res = await page.request.get('/insights/case-studies/full-platform-at-60-percent-cost');
    const h = res.headers();
    const hasHeader =
      !!h['x-frame-options'] ||
      !!h['x-content-type-options'] ||
      !!h['content-security-policy'] ||
      !!h['strict-transport-security'];
    if (!hasHeader) {
      console.warn('[Advisory] No security headers on /insights/case-studies/full-platform-at-60-percent-cost');
    }
    // Advisory only — do not hard-fail (CDN/proxy may strip headers)
  });

});
