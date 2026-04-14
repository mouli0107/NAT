
// @ts-nocheck
module.exports = {
  testMatch: ["C:/Users/chandramouli/Downloads/Nat20-main/Nat20-main/.autotest-tmp/run_1774601031109/tests/auto.spec.ts"],
  timeout: 60000,
  retries: 0,
  workers: 1,
  use: {
    headless: false,
    channel: 'chrome',       // use system Chrome — no download needed
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: { slowMo: 300 },
  },
  reporter: [['json', { outputFile: "C:/Users/chandramouli/Downloads/Nat20-main/Nat20-main/.autotest-tmp/run_1774601031109/results.json" }], ['line']],
  projects: [{ name: 'chrome', use: { channel: 'chrome' } }],
};
