import { test, expect } from '@playwright/test';
import { QualityEngineeringPage } from '../../pages/quality_engineering.page';

test.describe('♿ Accessibility | Quality Engineering Services | Software Quality Engineering', () => {
  let po: QualityEngineeringPage;

  test.beforeEach(async ({ page }) => {
    po = new QualityEngineeringPage(page);
    await po.navigate();
  });

  test('TC-A01 page has a descriptive, non-empty title', async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).not.toMatch(/^untitled|^undefined/i);
  });

  test('TC-A02 page has at least one H1 heading', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('TC-A03 all images have alt text', async ({ page }) => {
    const images  = page.locator('img');
    const count   = await images.count();
    const missing: string[] = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const src = await images.nth(i).getAttribute('src') ?? 'img-' + i;
      if (alt === null && !src.startsWith('data:')) missing.push(src.split('/').pop() ?? src);
    }
    if (missing.length > 0) console.warn('Missing alt on:', missing.join(', '));
    expect(missing.length).toBe(0);
  });

  test('TC-A04 keyboard Tab reaches an interactive element', async ({ page }) => {
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(
      () => document.activeElement?.tagName?.toLowerCase(),
    );
    const interactive = ['a', 'button', 'input', 'select', 'textarea', 'summary'];
    expect(interactive).toContain(tag);
  });

  test('TC-A05 form fields have associated labels or aria attributes', async ({ page }) => {
    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
    );
    const cnt = await inputs.count();
    let unlabeled = 0;
    for (let i = 0; i < Math.min(cnt, 10); i++) {
      const id          = await inputs.nth(i).getAttribute('id');
      const ariaLabel   = await inputs.nth(i).getAttribute('aria-label');
      const ariaLby     = await inputs.nth(i).getAttribute('aria-labelledby');
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      const hasLabel    = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      if (!hasLabel && !ariaLabel && !ariaLby && !placeholder) unlabeled++;
    }
    if (unlabeled > 0) console.warn(`${unlabeled} unlabeled inputs`);
    expect(unlabeled).toBe(0);
  });
});
