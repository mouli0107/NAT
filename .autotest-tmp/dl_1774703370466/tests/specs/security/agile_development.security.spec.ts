import { test, expect } from '@playwright/test';
import { AgileDevelopmentPage } from '../../pages/agile_development.page';
import { invalidEmails, edgeData, xssPayloads, sqlPayloads } from '../../data/test.data';

test.describe('🔒 Security | Agile Consulting Services, Agile Software Development Company', () => {
  test.beforeEach(async ({ page }) => {
    const po = new AgileDevelopmentPage(page);
    await po.navigate();
  });

  test('TC-SEC01 no sensitive data exposed in URL', async ({ page }) => {
    const url = page.url().toLowerCase();
    const sensitive = ['password=', 'passwd=', 'pwd=', 'token=', 'secret=', 'api_key='];
    for (const p of sensitive) {
      expect(url).not.toContain(p);
    }
  });

  test('TC-SEC02 response includes at least one security header', async ({ page }) => {
    const response = await page.request.get('https://www.nousinfosystems.com/services/agile-development');
    const headers  = response.headers();
    const checked  = ['x-frame-options', 'x-content-type-options', 'content-security-policy', 'strict-transport-security'];
    const present  = checked.filter(h => headers[h]);
    const missing  = checked.filter(h => !headers[h]);
    console.log('Security headers present:', present.join(', ') || 'none');
    console.log('Security headers missing:', missing.join(', ') || 'none');
    expect(present.length).toBeGreaterThanOrEqual(1);
  });

  test('TC-SEC03 XSS payload is not reflected unescaped in page', async ({ page }) => {
    const inputs = page.locator('input[type="text"], input[type="search"], textarea');
    if (await inputs.count() === 0) test.skip();
    await inputs.first().fill(xssPayloads[0]);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content).not.toContain('<script>alert("xss")</script>');
  });

  test('TC-SEC04 SQL injection payload does not cause server error', async ({ page }) => {
    const inputs = page.locator('input[type="text"], input[type="search"]');
    if (await inputs.count() === 0) test.skip();
    await inputs.first().fill(sqlPayloads[0]);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    const body = (await page.locator('body').textContent() ?? '').toLowerCase();
    const dbErrors = ['sql syntax', 'mysql error', 'database error', 'ora-', 'postgresql'];
    for (const err of dbErrors) {
      expect(body).not.toContain(err);
    }
  });
});
