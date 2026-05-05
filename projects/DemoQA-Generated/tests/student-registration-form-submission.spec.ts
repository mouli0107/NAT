import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { submitStudentRegistrationForm, navigateToRegistrationForm } from '@actions/business/contact.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Student Registration Form Submission', () => {
  test('Submit complete student registration form and verify confirmation message', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);
    
    await submitStudentRegistrationForm(page, {
      firstName: testData.firstName,
      lastName: testData.lastName,
      email: testData.email,
      mobileNumber: testData.mobileNumber,
      dateOfBirth: testData.dateOfBirth,
      subjects: testData.subjects,
      currentAddress: testData.currentAddress
    });
    
    await verifyText(page, 'Thanks for submitting the form');
  });
});