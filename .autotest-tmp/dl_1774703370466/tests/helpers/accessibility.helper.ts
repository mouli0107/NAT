import { Page, expect } from '@playwright/test';

export async function assertWCAGBaseline(page: Page): Promise<void> {
  const failures: string[] = [];

  const imgsWithoutAlt = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter(
        (img) =>
          img.getAttribute('alt') === null &&
          img.getAttribute('role') !== 'presentation' &&
          img.getAttribute('aria-hidden') !== 'true'
      )
      .map((img) => img.src.split('/').pop() ?? 'unknown')
  );
  if (imgsWithoutAlt.length > 0) {
    failures.push(`Images missing alt text: ${imgsWithoutAlt.join(', ')}`);
  }

  const unlabeledInputs = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
      )
    )
      .filter((inp) => {
        const id = (inp as HTMLInputElement).id;
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAria =
          inp.getAttribute('aria-label') ||
          inp.getAttribute('aria-labelledby');
        const hasPlaceholder = inp.getAttribute('placeholder');
        return !hasLabel && !hasAria && !hasPlaceholder;
      })
      .map((inp) => inp.outerHTML.substring(0, 80))
  );
  if (unlabeledInputs.length > 0) {
    failures.push(
      `Inputs without accessible label:\n  ${unlabeledInputs.join('\n  ')}`
    );
  }

  const emptyButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter(
        (btn) =>
          !btn.textContent?.trim() &&
          !btn.getAttribute('aria-label') &&
          !btn.title
      )
      .map((btn) => btn.outerHTML.substring(0, 80))
  );
  if (emptyButtons.length > 0) {
    failures.push(
      `Buttons without accessible text:\n  ${emptyButtons.join('\n  ')}`
    );
  }

  const lang = await page.evaluate(
    () => document.documentElement.getAttribute('lang')
  );
  if (!lang) {
    failures.push('HTML element is missing the lang attribute');
  }

  const h1Count = await page.locator('h1').count();
  if (h1Count === 0) {
    failures.push('Page has no H1 element');
  }

  if (failures.length > 0) {
    throw new Error(
      `WCAG baseline failures (${failures.length}):\n\n` +
      failures.map((f, i) => `${i + 1}. ${f}`).join('\n\n')
    );
  }
}
