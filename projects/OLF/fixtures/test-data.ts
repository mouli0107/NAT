import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Test data — extracted from recorded interactions.
 * Sensitive values (passwords, tokens) are read from environment variables.
 * Override any value by setting the corresponding env var.
 */
export const testData = {
  /** Base URL of the application under test */
  baseUrl: process.env.BASE_URL || 'https://apolf-web-preprod.azurewebsites.net/RedikerAcademy',

  /** Enter your email[id=txtUserName] */
  enterYourEmailidtxtUserName: process.env.ENTER_YOUR_EMAILIDTXT_USER_NAME || "sachin@sink.sendgrid.net",

  /** Enter your password[id=txtUserPassword] — set ENTER_YOUR_PASSWORDIDTXT_USER_PASSWORD_PASSWORD env var */
  enterYourPasswordidtxtUserPasswordPassword: process.env.ENTER_YOUR_PASSWORDIDTXT_USER_PASSWORD_PASSWORD || '',

} as const;

export type TestData = typeof testData;