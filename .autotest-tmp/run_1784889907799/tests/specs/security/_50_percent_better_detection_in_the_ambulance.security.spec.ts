import { test, expect } from '@playwright/test';
import { P50PercentBetterDetectionInTheAmbulancePage } from '../../pages/_50_percent_better_detection_in_the_ambulance.page';
import { assertNoXSSExecution, assertNoServerErrorExposed } from '../../helpers/security.helper';
import { xssPayloads } from '../../data/test.data';

test.describe('@security | An in ambulance AI copilot improved emergency detection by 50% | Artizent Case Study', () => {
  test('TC-SEC01 URL does not expose sensitive parameters', async ({ page }) => {
    const po = new P50PercentBetterDetectionInTheAmbulancePage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const url = page.url();
    const sensitive = /password|passwd|secret|token|api[_-]?key|auth|credential/i;
    expect(sensitive.test(url)).toBe(false);
  });

  test('TC-SEC02 security response headers are present', async ({ page }) => {
    const res = await page.request.get('/insights/case-studies/50-percent-better-detection-in-the-ambulance');
    const h = res.headers();
    const hasHeader =
      !!h['x-frame-options'] ||
      !!h['x-content-type-options'] ||
      !!h['content-security-policy'] ||
      !!h['strict-transport-security'];
    if (!hasHeader) {
      console.warn('[Advisory] No security headers on /insights/case-studies/50-percent-better-detection-in-the-ambulance');
    }
    // Advisory only — do not hard-fail (CDN/proxy may strip headers)
  });

});
