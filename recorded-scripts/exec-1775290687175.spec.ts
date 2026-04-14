import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

// ─── Cookie Consent Helper ────────────────────────────────────────────────────
async function dismissCookieConsent(page: any) {
  try {
    const acceptBtn = page.locator('xpath=//*[@id="onetrust-accept-btn-handler"]');
    if (await acceptBtn.isVisible({ timeout: 5000 })) {
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No banner — safe to proceed
  }
}

test('Recorded flow — PG Rewards & Offers (opens new tab)', async ({ page, context }) => {

  // ─── Object Repository ────────────────────────────────────────────────────
  const L = {
    // Rewards & Offers — anchored by href (target="_blank", opens new tab)
    // Uniqueness: unique | Stability: stable | Fallback: //a[normalize-space(text())='Rewards & Offers']
    rewardsOffersLink: page.locator(
      "xpath=//a[contains(@href,'pgbrandsaver.com')]"
    ).first(),

    // Main heading — structural, not content-based
    // Uniqueness: unique | Stability: stable | Fallback: //main//h1
    mainHeading: page.locator("xpath=//main//h1[1]"),
  };

  // ── Navigate ───────────────────────────────────────────────────────────────
  await page.goto('https://www.pg.com');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForURL('**/us.pg.com/**', { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 });

  // ── Dismiss cookie consent ────────────────────────────────────────────────
  await dismissCookieConsent(page);

  // ── Assert homepage loaded correctly ──────────────────────────────────────
  await expect(L.mainHeading).toBeVisible({ timeout: 10000 });

  // ── Click Rewards & Offers — captures the new tab it opens ───────────────
  await L.rewardsOffersLink.waitFor({ state: 'attached', timeout: 15000 });

  const [newTab] = await Promise.all([
    context.waitForEvent('page'),          // wait for new tab to open
    L.rewardsOffersLink.click(),           // click triggers target="_blank"
  ]);

  await newTab.waitForLoadState('domcontentloaded');

  // ── Assert new tab navigated to pgbrandsaver or pg rewards page ──────────
  await expect(newTab).toHaveURL(/pgbrandsaver|rewards/i, { timeout: 15000 });
});
