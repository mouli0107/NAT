import { Page, expect } from '@playwright/test';

/** Assert visible text exists on the page (substring match by default).
 *  Uses Playwright's :text()/:text-is() + :visible pseudo-class combination so we only
 *  match elements that are actually rendered on screen — not hidden mobile menus,
 *  collapsed accordions, breadcrumbs inside display:none containers, etc.
 */
export async function verifyText(page: Page, text: string, exact = false) {
  const escaped = text.replace(/"/g, '\\"');
  // :text-is() / :text() are Playwright's built-in text pseudo-classes.
  // :visible ensures the matched element is visible (not display:none / hidden).
  const sel = exact
    ? `:text-is("${escaped}"):visible`
    : `:text("${escaped}"):visible`;
  await expect(page.locator(sel).first()).toBeVisible({ timeout: 10000 });
}

/** Assert current URL contains a path */
export async function verifyUrl(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

/** Assert an element (by CSS/role selector) is visible */
export async function verifyVisible(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeVisible();
}

/** Assert page does NOT contain text */
export async function verifyNotPresent(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).not.toBeVisible();
}

/** Assert an input or textarea has a specific value */
export async function verifyInputValue(page: Page, label: string, expected: string) {
  const loc = page.locator(`input[placeholder*="${label}" i], textarea[placeholder*="${label}" i], input[aria-label*="${label}" i]`).first();
  await expect(loc).toHaveValue(expected);
}

/** Assert an input value contains a substring */
export async function verifyInputContains(page: Page, label: string, substring: string) {
  const loc = page.locator(`input[placeholder*="${label}" i], textarea[placeholder*="${label}" i]`).first();
  await expect(loc).toHaveValue(new RegExp(substring, 'i'));
}

/** Assert a button or element is enabled */
export async function verifyEnabled(page: Page, label: string) {
  await expect(page.getByRole('button', { name: label, exact: false })).toBeEnabled();
}

/** Assert a button or element is disabled */
export async function verifyDisabled(page: Page, label: string) {
  await expect(page.getByRole('button', { name: label, exact: false })).toBeDisabled();
}

/** Assert a checkbox or radio is checked */
export async function verifyChecked(page: Page, label: string) {
  await expect(page.getByLabel(label, { exact: false })).toBeChecked();
}

/** Assert a checkbox or radio is NOT checked */
export async function verifyUnchecked(page: Page, label: string) {
  await expect(page.getByLabel(label, { exact: false })).not.toBeChecked();
}

/** Assert an element has a specific HTML attribute value */
export async function verifyAttribute(page: Page, label: string, attr: string, expected: string) {
  const loc = page.getByText(label, { exact: false }).first();
  await expect(loc).toHaveAttribute(attr, expected);
}

/** Assert the number of elements matching a selector */
export async function verifyCount(page: Page, selector: string, count: number) {
  await expect(page.locator(selector)).toHaveCount(count);
}

/**
 * Soft assertion wrapper — logs failure without stopping the test.
 * Usage: await softAssert(() => verifyText(page, 'Success'), failures)
 */
export async function softAssert(
  fn: () => Promise<void>,
  failures: string[]
): Promise<void> {
  try {
    await fn();
  } catch (e: any) {
    failures.push(e.message || String(e));
    console.warn('[SOFT ASSERT FAILED]', e.message);
  }
}
