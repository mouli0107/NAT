/**
 * Canonical locator-naming helpers — single source of truth for D2.
 *
 * BOTH of the following must import from here and nowhere else:
 *   - the locator-file emitter  (writes `locators/<stem>.ts` to disk)
 *   - the page-object prompt    (tells Claude the import path)
 *
 * Naming rule (decided from D2 investigation 2026-05-11):
 *   <pageClassName>.locators
 *
 * Rationale: accepting the FULL class name (with "Page" suffix) and appending
 * only ".locators" ensures a one-to-one mapping between class name and file.
 * The previous convention of accepting the base name and appending "Page.locators"
 * caused double-Page suffixes (e.g. "NousinfosystemsPage" → "NousinfosystemsPagePage.locators")
 * whenever a URL path segment was literally "page" — those double-Page filenames
 * confused the LLM, which generated single-Page imports that didn't resolve.
 *
 * NEVER concatenate '.locators' anywhere else in the server/  tree.
 * The lint test in locator-naming.test.ts enforces this.
 */

/**
 * Returns the canonical TypeScript module stem (no .ts extension) for a
 * page's locator file.
 *
 * Input:  the FULL page class name, including the trailing 'Page' suffix.
 *         e.g. 'NousinfosystemsHomePage', 'ContactUsPage', 'FooBarPage'
 *
 * Output: the stem used for BOTH the on-disk filename AND the @locators import.
 *         e.g. 'NousinfosystemsHomePage.locators'
 *
 * Invariant:
 *   locator file → locators/${getLocatorModuleId(className)}.ts
 *   page import  → @locators/${getLocatorModuleId(className)}
 *   The tsconfig @locators alias resolves both to the same file.
 */
export function getLocatorModuleId(pageClassName: string): string {
  if (!pageClassName?.trim()) {
    throw new Error('getLocatorModuleId: pageClassName is required and must not be blank');
  }
  return `${pageClassName}.locators`;
}

/**
 * Returns the exported const name for the locators object inside a locators file.
 *
 * Input:  the FULL page class name, including the trailing 'Page' suffix.
 *         e.g. 'NousinfosystemsHomePage'
 *
 * Output: e.g. 'NousinfosystemsHomePageLocators'
 *
 * Kept alongside getLocatorModuleId so all locator-naming concerns live in one place.
 */
export function getLocatorClassName(pageClassName: string): string {
  if (!pageClassName?.trim()) {
    throw new Error('getLocatorClassName: pageClassName is required and must not be blank');
  }
  return `${pageClassName}Locators`;
}
