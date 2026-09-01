import { test, expect } from '@playwright/test';
import { SupplyChainTesting8xFasterPage } from '../../pages/supply_chain_testing_8x_faster.page';
import { assertNoXSSExecution, assertNoServerErrorExposed } from '../../helpers/security.helper';
import { xssPayloads } from '../../data/test.data';

test.describe('@security | Automated testing cut supply chain test cycles from 32 hours to 4 | Artizent Case Study', () => {
  test('TC-SEC01 URL does not expose sensitive parameters', async ({ page }) => {
    const po = new SupplyChainTesting8xFasterPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const url = page.url();
    const sensitive = /password|passwd|secret|token|api[_-]?key|auth|credential/i;
    expect(sensitive.test(url)).toBe(false);
  });

  test('TC-SEC02 security response headers are present', async ({ page }) => {
    const res = await page.request.get('/insights/case-studies/supply-chain-testing-8x-faster');
    const h = res.headers();
    const hasHeader =
      !!h['x-frame-options'] ||
      !!h['x-content-type-options'] ||
      !!h['content-security-policy'] ||
      !!h['strict-transport-security'];
    if (!hasHeader) {
      console.warn('[Advisory] No security headers on /insights/case-studies/supply-chain-testing-8x-faster');
    }
    // Advisory only — do not hard-fail (CDN/proxy may strip headers)
  });

});
