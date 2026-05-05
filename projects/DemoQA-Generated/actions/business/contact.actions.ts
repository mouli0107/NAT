import { Page } from '@playwright/test';
import { AutomationPracticeFormPage } from '@pages/AutomationPracticeFormPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyText, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Submit the complete student registration form with all required fields
 * and verify successful submission.
 */
export async function submitStudentRegistrationForm(page: Page, data = testData): Promise<void> {
  const pg = new AutomationPracticeFormPage(page);
  
  await navigateTo(page, data.baseUrl);
  
  await pg.fillFirstName(data.firstName);
  await pg.fillLastName(data.lastName);
  await pg.fillEmail(data.email);
  await pg.selectGenderMale();
  await pg.fillMobileNumber(data.mobileNumber);
  await pg.fillDateOfBirth(data.dateOfBirth);
  await pg.fillSubjects(data.subjects);
  await pg.selectHobbySports();
  await pg.selectHobbyReading();
  await pg.fillCurrentAddress(data.currentAddress);
  await pg.selectState('NCR');
  await pg.selectCity('Delhi');
  await pg.clickSubmit();
  
  await waitForNetworkIdle(page);
  
  await verifyText(page, 'Thanks for submitting the form');
}

/**
 * Navigate to the student registration form and verify the page loaded correctly.
 */
export async function navigateToRegistrationForm(page: Page, data = testData): Promise<void> {
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  
  await verifyVisible(page, 'Student Registration Form');
  await verifyVisible(page, 'Practice Form');
}