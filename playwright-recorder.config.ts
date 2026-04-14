import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './recorded-scripts',
  use: {
    headless: false,
    viewport: null,
    launchOptions: {
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
      ],
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 180000,
  retries: 0,
});
