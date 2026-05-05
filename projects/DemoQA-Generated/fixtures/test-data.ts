import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Test data — extracted from recorded interactions.
 * Sensitive values (passwords, tokens) are read from environment variables.
 * Override any value by setting the corresponding env var.
 */
export const testData = {
  /** Base URL of the application under test */
  baseUrl: process.env.BASE_URL || 'https://demoqa.com/automation-practice-form',

  /** First Name */
  firstName: process.env.FIRST_NAME || "John",

  /** Last Name */
  lastName: process.env.LAST_NAME || "Smith",

  /** Email */
  email: process.env.EMAIL || "john.smith@testmail.com",

  /** Mobile Number */
  mobileNumber: process.env.MOBILE_NUMBER || "9876543210",

  /** Date of Birth */
  dateOfBirth: process.env.DATE_OF_BIRTH || "15 Jan 2000",

  /** Subjects */
  subjects: process.env.SUBJECTS || "Maths",

  /** Current Address */
  currentAddress: process.env.CURRENT_ADDRESS || "Flat 23, Baker Street, London",

} as const;

export type TestData = typeof testData;