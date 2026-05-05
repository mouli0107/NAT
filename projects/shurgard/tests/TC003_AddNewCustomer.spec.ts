import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { loginToShurgard, selectLocation, navigateToCustomerSearch, addNewCustomer } from '../actions/business/Shurgard.actions';

// Run serially — all tests share the same user account.
// Parallel login causes "Your session has expired" modal.
test.describe.configure({ mode: 'serial' });

test.describe('TC003 — Add New Customer', () => {
  test.beforeEach(async ({ page }) => {
    await loginToShurgard(page);
    await selectLocation(page);
    await navigateToCustomerSearch(page);
  });

  test('Add new customer with valid details should redirect to customer info page', async ({ page }) => {
    await addNewCustomer(page);
    await expect(page).toHaveURL(/.*customer-management\/customer-information\/.+/);
  });

  test.skip('Customer form should require first name', async ({ page }) => {
    // Use unique email/phone so duplicate detection doesn't fire — only the missing
    // firstName field should trigger a validation error that keeps us on customer-addition.
    await addNewCustomer(page, {
      ...TestData.TC003,
      firstName:   '',
      email:       'no-match-fn@example.com',
      phoneNumber: '1111111111',
    });
    // Should stay on addition page — form validation blocks save
    await expect(page).toHaveURL(/.*customer-addition/);
  });

  test.skip('Customer form should require phone number', async ({ page }) => {
    // Use unique email so duplicate detection doesn't fire — only the missing
    // phoneNumber should trigger a validation error that keeps us on customer-addition.
    await addNewCustomer(page, {
      ...TestData.TC003,
      phoneNumber: '',
      email:       'no-match-ph@example.com',
    });
    await expect(page).toHaveURL(/.*customer-addition/);
  });
});
