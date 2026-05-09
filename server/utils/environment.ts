/**
 * server/utils/environment.ts
 * Reliable Azure vs. local environment detection.
 *
 * Azure App Service always injects WEBSITE_INSTANCE_ID and WEBSITE_SITE_NAME.
 * You can also force Azure mode with NAT_ENV=azure for local testing.
 */

/**
 * Returns true when running inside Azure App Service (or any cloud container
 * where a local display server is unavailable for headed Playwright).
 *
 * Checks (in order):
 *  1. NAT_ENV=azure   — explicit override, useful for local cloud-simulation tests
 *  2. WEBSITE_INSTANCE_ID — injected by Azure App Service on every instance
 *  3. WEBSITE_SITE_NAME   — injected by Azure App Service
 *  4. AZURE_FUNCTIONS_ENVIRONMENT — injected by Azure Functions runtime
 */
export function isAzureEnvironment(): boolean {
  if (process.env.NAT_ENV === 'azure') return true;
  if (process.env.WEBSITE_INSTANCE_ID)        return true;
  if (process.env.WEBSITE_SITE_NAME)          return true;
  if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) return true;
  return false;
}

/**
 * Returns true when the process is running inside any headless container
 * (Azure, Docker without Xvfb, CI/CD) — i.e. a headed browser cannot
 * open a real display window.
 *
 * Fallback: on Linux, check whether $DISPLAY is missing AND Xvfb is not
 * already running (set by ensureXvfb).
 */
export function isHeadlessContainer(): boolean {
  if (isAzureEnvironment()) return true;
  if (process.env.CI === 'true') return true;
  // On Linux with no DISPLAY set, the container truly has no screen
  if (process.platform === 'linux' && !process.env.DISPLAY) return true;
  return false;
}
