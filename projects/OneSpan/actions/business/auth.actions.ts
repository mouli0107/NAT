import { Page } from '@playwright/test'
import { WwwPage } from '@pages/WwwPage'
import { navigateTo, clickButton, clickLink, waitForNetworkIdle, clickAndWait } from '@actions/generic/browser.actions'
import { fillField, submitForm, typeInField, selectOption } from '@actions/generic/form.actions'
import { verifyText, verifyUrl, verifyVisible, verifyNotPresent, verifyInputValue, verifyAttribute, softAssert } from '@actions/generic/assert.actions'
import { testData } from '@fixtures/test-data'

/**
 * Navigate to the demo request page from homepage
 * Represents a prospective customer journey to request a product demo
 */
export async function navigateToDemoRequest(page: Page, data = testData) {
  // Navigate to OneSpan homepage
  await navigateTo(page, data.baseUrl)
  await waitForNetworkIdle(page)
  
  // Click Request demo link in main navigation
  await clickLink(page, 'Request demo')
  await waitForNetworkIdle(page)
  
  // Verify navigation to demo request form - validates correct page loaded
  await verifyUrl(page, '/products/request-a-demo')
}

/**
 * Submit demo request form with complete and valid information
 * Completes the full demo request workflow including form validation and successful submission
 */
export async function submitDemoRequest(page: Page, data = testData) {
  // Fill in first name field
  await page.click('text=First Name *')
  await fillField(page, '*First Name:[id=FirstName]', data.firstName)
  
  // Fill in last name field
  await fillField(page, '*Last Name:[id=LastName]', data.lastName)
  
  // Fill in business email address
  await page.click('text=Business Email *')
  await fillField(page, '*Email Address:[id=Email]', data.email)
  
  // Fill in company name
  await fillField(page, '*Company Name:[id=Company]', data.companyName)
  
  // Select industry from dropdown
  await selectOption(page, 'Industry', data.industry)
  
  // Fill in phone number
  await page.click('text=Phone *')
  await fillField(page, '*Phone Number:[id=Phone]', data.phoneNumber)
  
  // Select country from dropdown
  await selectOption(page, 'Country', data.country)
  
  // Select business interest area
  await selectOption(page, 'Business_Interest__c', data.businessInterest)
  
  // Fill in optional comments
  await page.click('text=Comments (optional)')
  await fillField(page, '*Comments:[id=Web_Form_Comments__c]', data.comments)
  
  // Submit the demo request form
  await clickButton(page, 'Submit')
  await waitForNetworkIdle(page)
  
  // Verify form submission succeeded - validates user received confirmation
  await verifyVisible(page, 'Thank you')
  
  // Verify submitted email matches what was entered - validates data integrity
  await verifyInputValue(page, '*Email Address:[id=Email]', data.email)
}

/**
 * Attempt form submission with incomplete data to validate error handling
 * Tests that required field validation prevents incomplete submissions
 */
export async function validateDemoRequestFormErrors(page: Page, data = testData) {
  const failures: string[] = []
  
  // Navigate to demo request page
  await clickLink(page, 'Request demo')
  await waitForNetworkIdle(page)
  
  // Fill in only partial information (incomplete first name)
  await page.click('text=First Name *')
  await fillField(page, '*First Name:[id=FirstName]', data.partialFirstName)
  
  // Enter invalid/incomplete email
  await page.click('text=Business Email *')
  await fillField(page, '*Email Address:[id=Email]', data.invalidEmail)
  
  // Select country
  await selectOption(page, 'Country', data.country)
  
  // Select business interest
  await selectOption(page, 'Business_Interest__c', data.businessInterest)
  
  // Fill in comments
  await page.click('text=Comments (optional)')
  await fillField(page, '*Comments:[id=Web_Form_Comments__c]', data.comments)
  
  // Attempt to submit with incomplete data
  await clickButton(page, 'Submit')
  await waitForNetworkIdle(page)
  
  // Verify validation error for missing last name - validates required field enforcement
  await softAssert(async () => {
    await verifyVisible(page, 'Please complete this required field')
  }, failures)
  
  // Verify form was not submitted - validates validation blocks submission
  await softAssert(async () => {
    await verifyUrl(page, '/products/request-a-demo')
  }, failures)
  
  // Verify invalid email error displayed - validates email format validation
  await softAssert(async () => {
    await verifyVisible(page, 'Enter a valid email')
  }, failures)
  
  return failures
}