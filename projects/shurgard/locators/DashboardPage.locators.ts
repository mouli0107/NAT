import { Page } from '@playwright/test';

export const DashboardPageLocators = (page: Page) => ({
  // Country picker — countries appear as clickable rows in the panel
  belgium: page.locator("xpath=//*[self::div or self::li or self::span][normalize-space(text())='Belgium']").filter({ visible: true }).first(),

  // Store picker — Angular styled list. Target exact store name text.
  p2phutBruxellesForest: page.locator("xpath=//*[normalize-space(text())='(P2PHUT) Bruxelles - Forest']").filter({ visible: true }).first(),

  // Sidebar navigation link to Customer Search — confirmed by DOM extraction.
  // Angular router renders it as <a href="/customer-search" routerlinkactive="active">.
  // This is the most reliable locator — no lazy-loading, always present after login.
  customerSearchLink: page.locator('a[href="/customer-search"]').filter({ visible: true }).first(),

  // Tile dashboard — DOM text is "Customer Management" (CSS text-transform renders it as uppercase).
  // Use case-insensitive translate() so it matches regardless of CSS transform.
  // Kept as fallback but sidebar link is preferred.
  customerManagementTile: page.locator(
    "xpath=//*[contains(translate(normalize-space(text()),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'customer management')]"
  ).filter({ visible: true }).first(),

  // Session-expired modal OK button
  sessionExpiredOk: page.locator("xpath=//button[normalize-space(text())='OK' or normalize-space(.)='OK']").filter({ visible: true }).first(),
});
