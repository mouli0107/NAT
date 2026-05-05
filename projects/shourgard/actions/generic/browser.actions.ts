import { Page } from '@playwright/test';

/** Navigate to a URL and wait for the page to fully settle */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // After domcontentloaded, attempt networkidle with generous timeout for SPAs
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
    // networkidle timeout is acceptable on pages with long-running polling
  });
}

/** Click a link by its visible text. Uses .first() to avoid strict-mode errors. */
export async function clickLink(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name, exact: false }).first().click();
}

/** Click a button by its visible text. Uses .first() to avoid strict-mode errors. */
export async function clickButton(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: false }).first().click();
}

/** Click any element matching a CSS selector */
export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().click();
}

/** Hover over an element by CSS selector */
export async function hoverElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().hover();
}

/** Press a keyboard key (e.g. 'Enter', 'Tab', 'Escape') */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

/** Scroll an element into view */
export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
}

/** Wait for a URL pattern — accepts a full URL, path segment like '/dashboard', or glob */
export async function waitForUrl(page: Page, pattern: string, timeoutMs = 15000): Promise<void> {
  // Full URL and existing globs are used as-is; path segments get a leading glob
  const glob = pattern.startsWith('http') || pattern.startsWith('**')
    ? pattern
    : `**${pattern.startsWith('/') ? '' : '/'}${pattern}`;
  await page.waitForURL(glob, { timeout: timeoutMs });
}

/** Wait for an element to be visible */
export async function waitForVisible(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
}

/** Wait for an element to disappear (e.g. loading spinner) */
export async function waitForHidden(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  await page.locator(selector).first().waitFor({ state: 'hidden', timeout: timeoutMs });
}

/** Reload the current page */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Get the current page URL */
export async function getCurrentUrl(page: Page): Promise<string> {
  return page.url();
}

/**
 * Wait for network to settle after an action that triggers API calls.
 * Call AFTER the triggering action — never before.
 */
export async function waitForNetworkIdle(page: Page, timeoutMs = 15000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
}

/** Wait for a loading spinner / skeleton to disappear */
export async function waitForLoadingComplete(
  page: Page,
  spinnerSelector = '[class*="loading"], [class*="spinner"], [class*="skeleton"]'
): Promise<void> {
  try {
    const spinner = page.locator(spinnerSelector).first();
    if (await spinner.isVisible({ timeout: 2000 })) {
      await spinner.waitFor({ state: 'hidden', timeout: 15000 });
    }
  } catch {
    // spinner never appeared — that's fine
  }
}

/**
 * Click a button then wait for network to settle.
 * The click fires FIRST, then we await networkidle so we capture
 * the network activity triggered by that click (not a prior state).
 */
export async function clickAndWait(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: false }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

/**
 * Click a button that causes a full-page navigation.
 * Waits for domcontentloaded AFTER the click — avoids the race where
 * waitForURL('**/*') resolves immediately against the current URL.
 */
export async function clickAndNavigate(page: Page, name: string): Promise<void> {
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 20000 }),
    page.getByRole('button', { name, exact: false }).first().click(),
  ]);
}

/**
 * Click a link that causes a full-page navigation.
 * Same pattern as clickAndNavigate but targets role='link'.
 */
export async function clickLinkAndNavigate(page: Page, name: string): Promise<void> {
  await Promise.all([
    page.waitForLoadState('domcontentloaded', { timeout: 20000 }),
    page.getByRole('link', { name, exact: false }).first().click(),
  ]);
}
