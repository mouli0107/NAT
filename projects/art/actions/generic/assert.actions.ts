import { Page, expect, test } from '@playwright/test';
import * as path from 'path';
import * as fs   from 'fs';

/** Assert visible text exists on the page (substring match by default).
 *  Uses Playwright's :text()/:text-is() + :visible pseudo-class combination so we only
 *  match elements that are actually rendered on screen — not hidden mobile menus,
 *  collapsed accordions, breadcrumbs inside display:none containers, etc.
 */
export async function verifyText(page: Page, text: string, exact = false) {
  const escaped = text.replace(/"/g, '\"');
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
 * Soft assertion — records the failure without stopping the test.
 * - label   : human-readable step name shown in console and HTML report
 * - failures: accumulated list; caller throws at the end if non-empty
 */
export async function softAssert(
  fn: () => Promise<void>,
  failures: string[],
  label = 'Assertion'
): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (e: any) {
    // Keep only the first 3 lines of the stack — enough to identify the failure
    const msg = (e.message || String(e)).split('\n').slice(0, 3).join(' | ');
    failures.push(`${label}: ${msg}`);
    console.error(`  ✗ ${label}\n    → ${msg}`);
  }
}

/**
 * Capture a full-page screenshot and print its absolute path to the console.
 * Called automatically by verify functions when any soft assertion failed.
 */
export async function screenshotOnFailure(page: Page, label: string): Promise<string> {
  const dir  = path.join('test-results', 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const safe = label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const file = path.join(dir, `${safe}-${Date.now()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const abs = path.resolve(file);
  console.error(`\n  📸 Screenshot saved: ${abs}\n`);
  return abs;
}
