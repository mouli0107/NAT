import { Page, expect } from '@playwright/test';

export async function assertFormSubmitSuccess(page: Page): Promise<void> {
  const wpcf7Success = page.locator('.wpcf7-mail-sent-ok');
  const genericSuccess = page.locator(
    '[class*="success"], [class*="thank"], [class*="confirm"]'
  );
  const successText = page.getByText(
    /thank you|message sent|successfully submitted|we.ll be in touch/i
  );

  try {
    await expect(wpcf7Success.or(genericSuccess).or(successText))
      .toBeVisible({ timeout: 8000 });
  } catch {
    throw new Error(
      'Form submission success indicator not found. ' +
      'Checked for: wpcf7 success element, ' +
      'success/thank/confirm class elements, ' +
      'and success text patterns. ' +
      `Current URL: ${page.url()}`
    );
  }
}

export async function assertValidationErrorsVisible(
  page: Page
): Promise<void> {
  const wpcfError = page.locator('.wpcf7-not-valid-tip');
  const ariaInvalid = page.locator('[aria-invalid="true"]');
  const errorClass = page.locator('[class*="error"]:visible');

  const wpcfCount = await wpcfError.count();
  const ariaCount = await ariaInvalid.count();
  const errorCount = await errorClass.count();

  if (wpcfCount === 0 && ariaCount === 0 && errorCount === 0) {
    throw new Error(
      'No validation errors visible after empty form submission. ' +
      'Expected at least one of: .wpcf7-not-valid-tip, ' +
      '[aria-invalid="true"], or visible [class*="error"] element.'
    );
  }
}

export async function assertPageStaysOnUrl(
  page: Page,
  originalUrl: string
): Promise<void> {
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(originalUrl);
}
