import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Test data — recorded from demoqa.com/automation-practice-form.
 * Flat object — NO nested properties.
 * Override any value with the corresponding env var.
 */
export const testData = {
  /** Base URL of the application under test */
  baseUrl: process.env.BASE_URL || 'https://demoqa.com/automation-practice-form',

  /** Student first name */
  firstName: process.env.FIRST_NAME || 'John',

  /** Student last name */
  lastName: process.env.LAST_NAME || 'Smith',

  /** Contact email address */
  email: process.env.EMAIL || 'john.smith@testmail.com',

  /** Gender selection */
  gender: (process.env.GENDER || 'Male') as 'Male' | 'Female' | 'Other',

  /** 10-digit mobile number */
  mobile: process.env.MOBILE || '9876543210',

  /** Date of birth month label */
  dobMonth: process.env.DOB_MONTH || 'January',

  /** Date of birth 4-digit year */
  dobYear: process.env.DOB_YEAR || '2000',

  /** Date of birth day number (no leading zero) */
  dobDay: process.env.DOB_DAY || '15',

  /** Subject for autocomplete */
  subject: process.env.SUBJECT || 'Maths',

  /** Current postal address */
  currentAddress: process.env.CURRENT_ADDRESS || 'Flat 23, Baker Street, London',

  /** State dropdown value */
  state: process.env.STATE || 'NCR',

  /** City dropdown value */
  city: process.env.CITY || 'Delhi',

  /** Expected success modal heading */
  successModalTitle: 'Thanks For Submitting The Form',
} as const;

export type TestData = typeof testData;
