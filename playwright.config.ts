import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env so REDIKER_PASSWORD, TEST_PASSWORD and other site-specific vars are available
dotenv.config();

export default defineConfig({
  testDir: './recorded-scripts',
  timeout: 180_000,  // 3 minutes — complex workflows (login + multi-step forms) need more time
  retries: 0,
  reporter: 'list',

  use: {
    headless: false,
    viewport: null,               // null = real screen size (maximized window)
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled', // hides navigator.webdriver from sites
        '--no-sandbox',
        '--disable-infobars',
      ],
    },
  },
});
