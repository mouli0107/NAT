import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export default defineConfig({
  testDir:       './tests',
  fullyParallel: false,    // run one test at a time — avoids session conflicts on shared user
  workers:       1,        // single browser process — no parallel browser windows
  timeout:       300_000,
  retries:       0,
  reporter:      'list',
  expect:        { timeout: 80_000 },  // VPN latency — assertions auto-retry up to 80s
  use: {
    baseURL:           process.env.SHURGARD_URL || 'http://192.168.21.175',
    headless:          false,
    viewport:          null,
    launchOptions: {
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars',
      ],
    },
    actionTimeout:     80_000,   // user requested 80s — VPN connection is slow
    navigationTimeout: 80_000,
    screenshot:        'only-on-failure',
    video:             'on',             // always record — saved to test-results/<test-name>/video.webm
  },
});
