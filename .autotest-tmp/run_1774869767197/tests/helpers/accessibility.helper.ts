import { Page, test } from '@playwright/test';

/**
 * Runs WCAG 2.1 AA baseline checks.
 *
 * ADVISORY MODE — violations are logged and attached as test annotations
 * but do NOT throw, so the test still passes.  The full report appears in
 * the Playwright HTML report under "Annotations" for each test.
 *
 * To make checks mandatory (hard-fail), set STRICT_A11Y=true in your env.
 */
export async function assertWCAGBaseline(page: Page): Promise<void> {
  const failures: string[] = [];

  // 1. Images without alt attribute
  const imgsWithoutAlt = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter(
        (img) =>
          img.getAttribute('alt') === null &&
          img.getAttribute('role') !== 'presentation' &&
          img.getAttribute('aria-hidden') !== 'true',
      )
      .map((img) => img.src.split('/').pop() ?? 'unknown'),
  );
  if (imgsWithoutAlt.length > 0) {
    failures.push(
      `${imgsWithoutAlt.length} image(s) missing alt: ${imgsWithoutAlt.slice(0, 3).join(', ')}${imgsWithoutAlt.length > 3 ? '…' : ''}`,
    );
  }

  // 2. Inputs without accessible label
  const unlabeled = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      ),
    )
      .filter((inp) => {
        const hasLabel =
          inp.id && !!document.querySelector(`label[for="${inp.id}"]`);
        return (
          !hasLabel &&
          !inp.getAttribute('aria-label') &&
          !inp.getAttribute('aria-labelledby') &&
          !inp.placeholder &&
          !inp.title
        );
      })
      .length,
  );
  if (unlabeled > 0) {
    failures.push(`${unlabeled} input(s) without accessible label`);
  }

  // 3. Buttons without accessible text
  const emptyButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter(
        (btn) =>
          !btn.textContent?.trim() &&
          !btn.getAttribute('aria-label') &&
          !btn.title &&
          btn.getAttribute('aria-hidden') !== 'true',
      ).length,
  );
  if (emptyButtons > 0) {
    failures.push(`${emptyButtons} button(s) without accessible text`);
  }

  // 4. HTML lang attribute
  const lang = await page.evaluate(
    () => document.documentElement.getAttribute('lang'),
  );
  if (!lang) {
    failures.push('HTML element is missing the lang attribute');
  }

  // 5. At least one H1
  const h1Count = await page.locator('h1').count();
  if (h1Count === 0) {
    failures.push('Page has no H1 heading');
  }

  if (failures.length === 0) return;

  const report =
    `WCAG 2.1 AA — ${failures.length} advisory issue(s):\n` +
    failures.map((f, i) => `  ${i + 1}. ${f}`).join('\n');

  // Attach as a test annotation so it appears in the HTML report
  try {
    test.info().annotations.push({ type: 'a11y-advisory', description: report });
  } catch {
    // test.info() may not be available in all contexts
  }

  // Always log to stdout so it appears in the terminal
  console.warn('[A11Y ADVISORY]\n' + report);

  // Hard-fail only when explicitly opted in (e.g. CI strictness)
  if (process.env['STRICT_A11Y'] === 'true') {
    throw new Error(report);
  }
}
