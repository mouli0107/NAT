import { test as setup } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await page.waitForLoadState('networkidle');

  // Fill username — reads from TEST_USERNAME env var
  await page.getByLabel('Enter your email[id=txtUserName]', { exact: false }).fill(process.env.TEST_USERNAME || '');

  // Fill password — reads from TEST_PASSWORD env var
  await page.getByLabel('Enter your password[id=txtUserPassword]', { exact: false }).fill(process.env.TEST_PASSWORD || '');

  // Submit login form
  await page.getByRole('button', { name: 'Login', exact: false }).click();

  // Wait for successful login (URL should change away from login page)
  await page.waitForURL(url => !url.href.includes('RedikerAcademy'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Save session cookies/storage for all subsequent tests
  await page.context().storageState({ path: authFile });
  console.log('✅ Auth state saved to .auth/user.json');
});
