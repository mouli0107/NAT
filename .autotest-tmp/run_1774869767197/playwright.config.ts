import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 30000,

  use: {
    baseURL: process.env.BASE_URL ?? 'https://amerisure.com',
    actionTimeout: 10000,
    navigationTimeout: 20000,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  projects: [
    {
      name: 'smoke',
      testMatch: '**/specs/smoke/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'functional',
      testMatch: '**/specs/functional/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'negative',
      testMatch: '**/specs/negative/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'edge',
      testMatch: '**/specs/edge/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security',
      testMatch: '**/specs/security/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'accessibility',
      testMatch: '**/specs/accessibility/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: 'test-results',
});
