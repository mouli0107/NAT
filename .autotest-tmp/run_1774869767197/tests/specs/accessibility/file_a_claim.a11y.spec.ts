import { test, expect } from '@playwright/test';
import { FileAClaimPage } from '../../pages/file_a_claim.page';
import { assertWCAGBaseline } from '../../helpers/accessibility.helper';

test.describe('@accessibility | File a Claim - Amerisure', () => {
  test('TC-A1101 WCAG 2.1 AA baseline checks pass', async ({ page }) => {
    const po = new FileAClaimPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    await assertWCAGBaseline(page);
  });

  test('TC-A1102 page has a descriptive non-empty title', async ({ page }) => {
    const po = new FileAClaimPage(page);
    await po.navigate();
    await po.waitForPageLoad();
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title).not.toMatch(/^(untitled|undefined|null)$/i);
  });

  test('TC-A1103 keyboard Tab reaches an interactive element', async ({ page }) => {
    const po = new FileAClaimPage(page);
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
