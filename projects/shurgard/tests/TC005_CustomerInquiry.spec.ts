import { test, expect } from '@playwright/test';
import { loginToShurgard, selectLocation, navigateToCustomerSearch, searchAndSelectCustomer, updateCustomerInquiry } from '../actions/business/Shurgard.actions';

// Run serially — all tests share the same user account.
test.describe.configure({ mode: 'serial' });

test.describe('TC005 — Customer Inquiry', () => {
  test.beforeEach(async ({ page }) => {
    await loginToShurgard(page);
    await selectLocation(page);
    await navigateToCustomerSearch(page);
    await searchAndSelectCustomer(page);
  });

  test('Update customer inquiry with valid details should save successfully', async ({ page }) => {
    await updateCustomerInquiry(page);
    // After save we should remain on the inquiry page (no navigation away)
    await expect(page).toHaveURL(/.*customer-management\/customer-inquiry.*/);
  });
});
