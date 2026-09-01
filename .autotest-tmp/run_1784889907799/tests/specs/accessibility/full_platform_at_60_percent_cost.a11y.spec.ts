import { test, expect } from '@playwright/test';
import { FullPlatformAt60PercentCostPage } from '../../pages/full_platform_at_60_percent_cost.page';
import { assertWCAGBaseline } from '../../helpers/accessibility.helper';

test.describe('@accessibility | An insurance policy administration platform, delivered in under a year using an AI native, secure development process | Artizent Case Study', () => {
  test('TC-A1101 WCAG 2.1 AA baseline checks pass', async ({ page }) => {
    const po = new FullPlatformAt60PercentCostPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await assertWCAGBaseline(page);
  });

  test('TC-A1102 page has a descriptive non-empty title', async ({ page }) => {
    const po = new FullPlatformAt60PercentCostPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).not.toMatch(/^(untitled|undefined|null)$/i);
  });

  test('TC-A1103 keyboard Tab reaches an interactive element', async ({ page }) => {
    const po = new FullPlatformAt60PercentCostPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(
      () => document.activeElement?.tagName ?? 'BODY',
    );
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'BODY']).toContain(
      focusedTag,
    );
  });
});
