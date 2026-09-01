import { Page, expect } from '@playwright/test';

/**
 * Asserts that a form submission succeeded.
 * Checks for success indicators without relying on URL change.
 */
export async function assertFormSubmitSuccess(page: Page): Promise<void> {
  const successLocator = page
    .locator(
      '.wpcf7-mail-sent-ok, ' +
      '[class*="success"]:visible, ' +
      '[class*="thank"]:visible, ' +
      '[class*="confirm"]:visible',
    )
    .or(
      page.getByText(
        /thank you|message sent|successfully submitted|we.ll be in touch|received your/i,
      ),
    );

  await expect(successLocator.first()).toBeVisible({ timeout: 10000 });
}

/**
 * Asserts that at least one validation error is visible.
 */
export async function assertValidationErrorVisible(page: Page): Promise<void> {
  const errorLocator = page.locator(
    '.wpcf7-not-valid-tip, ' +
    '[aria-invalid="true"], ' +
    '[class*="error"]:visible, ' +
    '[class*="invalid"]:visible',
  );
  await expect(errorLocator.first()).toBeVisible({ timeout: 5000 });
}
