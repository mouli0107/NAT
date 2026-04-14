import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'https://nousinfosystems.com',
    headless: false,
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    launchOptions: { slowMo: 200 },
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'],
  ],
  projects: [
    { name: 'smoke',         testMatch: '**/specs/smoke/**/*.spec.ts' },
    { name: 'functional',    testMatch: '**/specs/functional/**/*.spec.ts' },
    { name: 'negative',      testMatch: '**/specs/negative/**/*.spec.ts' },
    { name: 'edge',          testMatch: '**/specs/edge/**/*.spec.ts' },
    { name: 'security',      testMatch: '**/specs/security/**/*.spec.ts' },
    { name: 'accessibility', testMatch: '**/specs/accessibility/**/*.spec.ts' },
  ],
});
