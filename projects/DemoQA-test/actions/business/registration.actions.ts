import { Page } from '@playwright/test';
import { AutomationPracticeFormPage } from '@pages/AutomationPracticeFormPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyText, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Business Action: Fill and submit the Student Registration form.
 * Uses the AutomationPracticeFormPage POM exclusively — zero inline Playwright calls.
 */
export async function submitStudentRegistration(
  page: Page,
  data = testData
): Promise<void> {
  const form = new AutomationPracticeFormPage(page);

  // Navigate to the practice form
  await form.navigate();
  await waitForNetworkIdle(page);

  // Personal information
  await form.fillFirstName(data.firstName);
  await form.fillLastName(data.lastName);
  await form.fillEmail(data.email);
  await form.selectGender(data.gender);
  await form.fillMobile(data.mobile);

  // Date of birth
  await form.fillDateOfBirth(data.dobMonth, data.dobYear, data.dobDay);

  // Subjects (autocomplete)
  await form.addSubject(data.subject);

  // Hobbies checkboxes
  await form.checkSports();
  await form.checkReading();

  // Address and location
  await form.fillCurrentAddress(data.currentAddress);
  await form.selectState(data.state);
  await form.selectCity(data.city);

  // Submit the form
  await form.clickSubmit();
}

/**
 * Business Action: Verify the success modal is shown with correct heading.
 * Validates the form submission outcome.
 */
export async function verifyRegistrationSuccess(
  page: Page,
  data = testData
): Promise<void> {
  const form = new AutomationPracticeFormPage(page);

  // Assert success modal is visible — proves form submission worked
  await verifyVisible(page, "#example-modal-sizes-title-lg");

  // Assert correct success heading — validates business rule: "submission must be acknowledged"
  await verifyText(page, data.successModalTitle);

  // Assert student name appears in the confirmation table — proves data was persisted
  await verifyText(page, `${data.firstName} ${data.lastName}`);

  // Assert email appears in the confirmation — proves contact data captured correctly
  await verifyText(page, data.email);

  // Close the modal
  await form.closeSuccessModal();
}
