import { Page, Locator, expect } from '@playwright/test';

export async function assertNoXSSExecution(
  page: Page,
  payloads: string[],
  fieldLocator: Locator
): Promise<void> {
  const firedDialogs: string[] = [];

  page.on('dialog', async (dialog) => {
    firedDialogs.push(
      `Dialog type=${dialog.type()} message="${dialog.message()}"`
    );
    await dialog.dismiss();
  });

  for (const payload of payloads) {
    await fieldLocator.fill(payload);
    await fieldLocator.blur();
    await page.waitForTimeout(400);
  }

  expect(
    firedDialogs,
    `XSS payloads triggered JavaScript execution:\n${firedDialogs.join('\n')}`
  ).toHaveLength(0);

  await expect(page.locator('body')).toBeVisible();
}

export async function assertNoDBErrorExposed(page: Page): Promise<void> {
  const bodyText = (await page.locator('body').innerText()).toLowerCase();

  const dbErrorPatterns = [
    'sql syntax',
    'mysql_error',
    'ora-',
    'pg::',
    'sqlite3',
    'syntax error near',
    'unclosed quotation mark',
    'invalid query',
    'database error',
    'pdoexception',
    'sqlstate',
  ];

  const found = dbErrorPatterns.filter((p) => bodyText.includes(p));

  expect(
    found,
    `Database error strings exposed in page body: ${found.join(', ')}`
  ).toHaveLength(0);
}
