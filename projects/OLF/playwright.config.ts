import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    headless: process.env.CI ? true : false,
    baseURL: process.env.BASE_URL || 'https://apolf-web-preprod.azurewebsites.net/RedikerAcademy',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Path aliases from tsconfig.json are honoured automatically by Playwright
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],
  outputDir: 'test-results',
  projects: [
    // 1. Run auth setup first — logs in and saves session to .auth/user.json
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // 2. Run all tests with the saved session (no login per test)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
