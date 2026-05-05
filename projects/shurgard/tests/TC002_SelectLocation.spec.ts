import { test, expect } from '@playwright/test';
import { loginToShurgard, selectLocation, navigateToCustomerSearch } from '../actions/business/Shurgard.actions';

test.describe('TC002 — Select Location', () => {
  test.beforeEach(async ({ page }) => {
    await loginToShurgard(page);
  });

  test('Select Belgium > P2PHUT Bruxelles Forest should show store in header', async ({ page }) => {
    await selectLocation(page);
    // After store selection the URL stays at /dashboard and the store name appears in the header
    await expect(page).toHaveURL(/.*dashboard/);
    // The header shows the selected store name (confirms store selection succeeded)
    await expect(
      page.locator("xpath=//*[contains(normalize-space(text()),'Bruxelles - Forest')]").first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Navigate to Customer Search should reach customer-search page', async ({ page }) => {
    await selectLocation(page);
    await navigateToCustomerSearch(page);
    await expect(page).toHaveURL(/.*customer-search/);
  });
});
