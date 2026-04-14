import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available
import { RedikerAcademyPageLocators } from '../locators/RedikerAcademyPage.locators';
import { LandingPageLocators } from '../locators/LandingPage.locators';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators } from '../helpers/universal';

test('Recorded flow', async ({ page, context }) => {
  const L = {
    emailInput          : RedikerAcademyPageLocators.emailInput(page),
    passwordInput       : RedikerAcademyPageLocators.passwordInput(page),
    loginButton         : RedikerAcademyPageLocators.loginButton(page),
    joeRogan            : LandingPageLocators.joeRogan(page),
    btn126Button        : LandingPageLocators.btn126Button(page),
  };

  await page.goto('https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await L.emailInput.fill('sachin@sink.sendgrid.net');
  await L.passwordInput.fill(process.env.TEST_PASSWORD!);
  await L.loginButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Applicant/Landing');
  await expect(page.getByText('+Register New Student', { exact: false }).first()).toBeVisible();
  await L.joeRogan.click();
  await L.btn126Button.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm');
});