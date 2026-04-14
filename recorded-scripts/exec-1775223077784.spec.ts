import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available

test('Recorded flow', async ({ page }) => {
  await page.goto('https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await page.waitForLoadState('domcontentloaded');

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Applicant/Landing');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Invoice/Invoice');
});