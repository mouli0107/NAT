import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  retries: 0,
  reporter: 'list',
  use: {
    headless: false,
    viewport: null,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'on',
    video: 'on',
    launchOptions: {
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
      ],
    },
  },
});
