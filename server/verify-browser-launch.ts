/**
 * Proves the Azure/Linux browser-launch fix without needing a Linux machine.
 *
 * The bug: the Autonomous Testing crawl hardcoded headed mode, and the headed
 * branch fell back to `channel: 'chrome'` whenever it could not find Chrome at
 * one of two WINDOWS paths. On a Linux container that channel resolves to
 * /opt/google/chrome/chrome, which the image does not ship, so the crawl died
 * with "Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome".
 *
 *   npx tsx server/verify-browser-launch.ts
 */
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { headedLaunchPlan } from './playwright-service.js';
import { shouldRunHeaded, findRealChrome, resolvePlaywrightCache } from './playwright-setup.js';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  -> ' + detail : ''}`); }
}

/** Run fn with process.platform and selected env vars temporarily overridden. */
function withEnv(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  fn: () => void
) {
  const realPlatform = process.platform;
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) { saved[k] = process.env[k]; }
  try {
    Object.defineProperty(process, 'platform', { value: platform, configurable: true });
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    fn();
  } finally {
    Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true });
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

console.log('=== A. headedLaunchPlan: the channel that caused the Azure failure ===');

// THE regression test. Linux, no real Chrome, no cached download.
{
  const plan = headedLaunchPlan('linux', null, null);
  check('A1 linux + no chrome     -> never asks for channel "chrome"',
    plan.channel === undefined, `got channel=${plan.channel}`);
  check('A2 linux + no chrome     -> leaves executablePath unset so Playwright uses its bundled Chromium',
    plan.executablePath === undefined, `got ${plan.executablePath}`);
}
{
  const plan = headedLaunchPlan('linux', null, '/ms-playwright/chromium-1187/chrome-linux/chrome');
  check('A3 linux + cached chromium -> uses the cached binary, still no channel',
    plan.executablePath === '/ms-playwright/chromium-1187/chrome-linux/chrome' && plan.channel === undefined,
    JSON.stringify(plan));
}
{
  const plan = headedLaunchPlan('linux', '/opt/google/chrome/chrome', null);
  check('A4 linux + real chrome present -> uses it directly (no channel lookup)',
    plan.executablePath === '/opt/google/chrome/chrome' && plan.channel === undefined,
    JSON.stringify(plan));
}
{
  const plan = headedLaunchPlan('win32', null, null);
  check('A5 windows + nothing found -> channel "chrome" is still allowed (existing local behaviour)',
    plan.channel === 'chrome', JSON.stringify(plan));
}
{
  const plan = headedLaunchPlan('win32', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', null);
  check('A6 windows + real chrome  -> uses the real Chrome window',
    plan.executablePath?.endsWith('chrome.exe') === true && plan.channel === undefined,
    JSON.stringify(plan));
}

console.log('\n=== B. shouldRunHeaded: a server must not open a window nobody can see ===');

withEnv('linux', { AUTOTEST_HEADED: undefined, DISPLAY: undefined }, () => {
  check('B1 linux, no flag             -> headless (this is what stops the Azure crash)', shouldRunHeaded() === false);
});
withEnv('linux', { AUTOTEST_HEADED: 'true', DISPLAY: undefined }, () => {
  check('B2 linux, forced but no DISPLAY -> still headless, warns instead of failing', shouldRunHeaded() === false);
});
withEnv('linux', { AUTOTEST_HEADED: 'true', DISPLAY: ':99' }, () => {
  check('B3 linux, forced + Xvfb DISPLAY -> headed is honoured', shouldRunHeaded() === true);
});
withEnv('win32', { AUTOTEST_HEADED: undefined, DISPLAY: undefined }, () => {
  check('B4 windows, no flag          -> headed, so local "watch the crawl" is unchanged', shouldRunHeaded() === true);
});
withEnv('win32', { AUTOTEST_HEADED: 'false', DISPLAY: undefined }, () => {
  check('B5 windows, explicitly off   -> headless', shouldRunHeaded() === false);
});

console.log('\n=== C. Browser discovery finds the container layout ===');
{
  // Recreate the Docker image layout: PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
  // containing chromium-<rev>/chrome-linux/chrome
  const root = join(tmpdir(), `ms-playwright-verify-${Date.now()}`);
  const binDir = join(root, 'chromium-1187', 'chrome-linux');
  mkdirSync(binDir, { recursive: true });
  const bin = join(binDir, 'chrome');
  writeFileSync(bin, '#!/bin/sh\n');
  try {
    withEnv(process.platform, { PLAYWRIGHT_BROWSERS_PATH: root }, () => {
      const found = resolvePlaywrightCache();
      check('C1 resolves chromium under PLAYWRIGHT_BROWSERS_PATH (the /ms-playwright layout)',
        typeof found === 'string' && found.includes('chromium-1187') && found.endsWith('chrome'),
        `got ${found}`);
    });
    // Without the env var pointing at it, that fake tree must not be found —
    // proves C1 passed because of the env var, not by accident.
    withEnv(process.platform, { PLAYWRIGHT_BROWSERS_PATH: undefined }, () => {
      const found = resolvePlaywrightCache();
      check('C2 the same tree is NOT found once PLAYWRIGHT_BROWSERS_PATH is unset',
        found === null || !found.includes('ms-playwright-verify'), `got ${found}`);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log('\n=== D. Sanity on this machine ===');
console.log(`  platform            : ${process.platform}`);
console.log(`  real Chrome found   : ${findRealChrome() ?? '(none)'}`);
console.log(`  headed on this host : ${shouldRunHeaded()}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
