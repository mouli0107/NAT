import { Page, Locator, expect } from '@playwright/test';

/**
 * Tests that XSS payloads injected into a field do not execute JavaScript.
 * Dialog handler registered BEFORE any fill() calls.
 */
export async function assertNoXSSExecution(
  page: Page,
  payloads: readonly string[],
  fieldLocator: Locator,
): Promise<void> {
  const fired: string[] = [];

  page.on('dialog', async (dialog) => {
    fired.push(`type="${dialog.type()}" msg="${dialog.message()}"`);
    await dialog.dismiss();
  });

  for (const payload of payloads) {
    await fieldLocator.fill(payload);
    await fieldLocator.blur();
    await page.waitForFunction(() => true);
  }

  expect(
    fired,
    `XSS payload(s) triggered JavaScript:\n${fired.join('\n')}`,
  ).toHaveLength(0);
}

/**
 * Asserts no database/server error strings are exposed in the page body.
 */
export async function assertNoServerErrorExposed(page: Page): Promise<void> {
  const bodyText = (await page.locator('body').innerText()).toLowerCase();

  const errorPatterns = [
    'sql syntax', 'mysql_error', 'ora-', 'pg::', 'sqlite3',
    'syntax error near', 'unclosed quotation mark', 'database error',
    'pdoexception', 'sqlstate', 'stack trace',
    'internal server error', 'exception in thread',
  ] as const;

  const found = errorPatterns.filter((p) => bodyText.includes(p));

  expect(
    found,
    `Server error strings exposed in page body: ${found.join(', ')}`,
  ).toHaveLength(0);
}
