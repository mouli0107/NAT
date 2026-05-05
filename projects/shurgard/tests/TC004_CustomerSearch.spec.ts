import { test, expect } from '@playwright/test';
import { loginToShurgard, selectLocation, navigateToCustomerSearch, searchAndSelectCustomer } from '../actions/business/Shurgard.actions';

// Run serially — all tests share the same user account.
test.describe.configure({ mode: 'serial' });

test.describe('TC004 — Customer Search', () => {
  test.beforeEach(async ({ page }) => {
    await loginToShurgard(page);
    await selectLocation(page);
    await navigateToCustomerSearch(page);
  });

  test('Search by first name should navigate to customer information page', async ({ page }) => {
    const customerId = await searchAndSelectCustomer(page);
    await expect(page).toHaveURL(/.*customer-management\/customer-information\/.+/);
    // The action also returns the customer ID extracted from the URL
    expect(customerId).toMatch(/^\d+$/);
  });
});
