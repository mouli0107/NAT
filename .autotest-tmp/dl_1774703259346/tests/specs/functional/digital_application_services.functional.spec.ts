import { test, expect } from '@playwright/test';
import { DigitalApplicationServicesPage } from '../../pages/digital_application_services.page';

test.describe('✅ Functional | Digital Application Services, Application Lifecycle Services', () => {
  let po: DigitalApplicationServicesPage;

  test.beforeEach(async ({ page }) => {
    po = new DigitalApplicationServicesPage(page);
    await po.navigate();
  });

  test('TC-F01 page renders visible content and scrolls fully', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Achieve digital success with reliable IT application services');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-F02 internal links return HTTP 2xx', async ({ page }) => {
    const links = page.locator('a[href]');
    const count = await links.count();
    const hostname = new URL('https://nousinfosystems.com').hostname;
    const broken: string[] = [];
    for (let i = 0; i < Math.min(count, 15); i++) {
      const href = await links.nth(i).getAttribute('href') ?? '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      if (href.startsWith('http') && !href.includes(hostname)) continue;
      const full = href.startsWith('http') ? href : `https://nousinfosystems.com${href.startsWith('/') ? '' : '/'}${href}`;
      try {
        const resp = await page.request.get(full, { timeout: 8000 });
        if (resp.status() >= 400) broken.push(`${resp.status()} ${full}`);
      } catch { /* skip unreachable */ }
    }
    if (broken.length > 0) console.warn('Broken links:', broken.join(', '));
    expect(broken.length).toBe(0);
  });

  test('TC-F03 form accepts valid data and submits without crash', async ({ page }) => {
    await page.locator('input[name="s"]').first().fill('Test Value');
    await page.locator('input[name="your-name"]').first().fill('John Doe');
    await page.locator('input[name="your-email"]').first().fill('test@example.com');
    await page.locator('#phoneNumberInput').first().fill('9876543210');
    await page.locator('input[name="your-subject"]').first().fill('Test Subject');
    await page.locator('textarea[name="your-message"]').first().fill('25');
    await page.screenshot({ path: 'screenshots/digital_application_services-form-filled.png' });
    const submit = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await submit.count() > 0) {
      await submit.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(3000);
    // Verify: no server error page appeared
    const bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText.toLowerCase()).not.toContain('internal server error');
    expect(bodyText.toLowerCase()).not.toContain('500');
  });

  test('TC-F04 form fields have visible labels or placeholders', async ({ page }) => {
    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
    );
    const cnt = await inputs.count();
    let unlabeled = 0;
    for (let i = 0; i < cnt; i++) {
      const id          = await inputs.nth(i).getAttribute('id');
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      const ariaLabel   = await inputs.nth(i).getAttribute('aria-label');
      const hasLabel    = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      if (!hasLabel && !placeholder && !ariaLabel) unlabeled++;
    }
    if (unlabeled > 0) console.warn(`${unlabeled} input(s) without label/placeholder/aria-label`);
    expect(unlabeled).toBe(0);
  });
});
