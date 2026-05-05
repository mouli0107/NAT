import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { submitStudentRegistration, verifyRegistrationSuccess } from '@actions/business/registration.actions';
import { testData } from '@fixtures/test-data';

/**
 * TC001 — Student Registration Form Submission
 * Validates that a student can complete the practice form and receive confirmation.
 *
 * Business flow:
 *  1. Navigate to the registration form
 *  2. Fill all personal, academic and location fields
 *  3. Submit the form
 *  4. Verify the success modal shows correct student details
 */
test.describe('Student Registration Form', () => {
  test('Submit complete registration form and verify confirmation modal', async ({ page }) => {
    // Navigate and dismiss any overlays (cookie banners, ads)
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);

    // Fill every section of the form and click Submit
    await submitStudentRegistration(page);

    // Assert the success modal appears with correct data
    await verifyRegistrationSuccess(page);
  });
});
