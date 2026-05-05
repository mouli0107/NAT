import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Test data — extracted from recorded interactions.
 * Sensitive values (passwords, tokens) are read from environment variables.
 * Override any value by setting the corresponding env var.
 */
export const testData = {
  /** Base URL of the application under test */
  baseUrl: process.env.BASE_URL || 'https://www.nousinfosystems.com',

} as const;

export type TestData = typeof testData;