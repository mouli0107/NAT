import { Page } from '@playwright/test';

/**
 * Fill a field by label text, placeholder, or aria-label (in priority order).
 * Handles both label-associated inputs and placeholder-only inputs.
 */
export async function fillField(page: Page, labelOrPlaceholder: string, value: string) {
  // Try label-associated input first (most accessible pattern)
  const byLabel = page.getByLabel(labelOrPlaceholder, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().clear();
    await byLabel.first().fill(value);
    return;
  }
  // Fallback: placeholder attribute (case-insensitive)
  const byPlaceholder = page.getByPlaceholder(labelOrPlaceholder, { exact: false });
  if (await byPlaceholder.count() > 0) {
    await byPlaceholder.first().clear();
    await byPlaceholder.first().fill(value);
    return;
  }
  // Last resort: aria-label or name attribute
  await page.locator(
    `input[aria-label*="${labelOrPlaceholder}" i], textarea[aria-label*="${labelOrPlaceholder}" i], input[name*="${labelOrPlaceholder}" i]`
  ).first().fill(value);
}

/** Fill a password field — reads value from TEST_PASSWORD env var for security */
export async function fillPassword(page: Page, labelOrPlaceholder: string) {
  const val = process.env.TEST_PASSWORD || '';
  const byLabel = page.getByLabel(labelOrPlaceholder, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().fill(val);
    return;
  }
  await page.locator(`input[type="password"]`).first().fill(val);
}

/** Clear a field then type value character by character (useful for autocomplete inputs) */
export async function typeInField(page: Page, labelOrPlaceholder: string, value: string) {
  const byLabel = page.getByLabel(labelOrPlaceholder, { exact: false });
  const locator = await byLabel.count() > 0
    ? byLabel.first()
    : page.getByPlaceholder(labelOrPlaceholder, { exact: false }).first();
  await locator.clear();
  await locator.pressSequentially(value, { delay: 50 });
}

/** Check a checkbox by label text or selector */
export async function checkBox(page: Page, labelOrSelector: string) {
  const byLabel = page.getByLabel(labelOrSelector, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().check();
    return;
  }
  await page.locator(labelOrSelector).first().check();
}

/** Uncheck a checkbox by label text or selector */
export async function uncheckBox(page: Page, labelOrSelector: string) {
  const byLabel = page.getByLabel(labelOrSelector, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().uncheck();
    return;
  }
  await page.locator(labelOrSelector).first().uncheck();
}

/** Select a dropdown option by the field's label and the option's visible text */
export async function selectOption(page: Page, labelText: string, value: string) {
  const byLabel = page.getByLabel(labelText, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.selectOption({ label: value });
    return;
  }
  // Fallback: find select element by name attribute
  await page.locator(`select[name*="${labelText}" i]`).first().selectOption({ label: value });
}

/** Upload a file to a file input */
export async function uploadFile(page: Page, labelText: string, filePath: string) {
  const byLabel = page.getByLabel(labelText, { exact: false });
  if (await byLabel.count() > 0) {
    await byLabel.first().setInputFiles(filePath);
    return;
  }
  await page.locator('input[type="file"]').first().setInputFiles(filePath);
}

/** Submit the active form — tries submit button first, then form.submit() */
export async function submitForm(page: Page, buttonText?: string) {
  if (buttonText) {
    await page.getByRole('button', { name: buttonText, exact: false }).first().click();
    return;
  }
  // Try common submit button patterns
  const submitBtn = page.getByRole('button', { name: /submit|save|continue|next|login|sign in/i });
  if (await submitBtn.count() > 0) {
    await submitBtn.first().click();
    return;
  }
  await page.locator('[type="submit"]').first().click();
}
