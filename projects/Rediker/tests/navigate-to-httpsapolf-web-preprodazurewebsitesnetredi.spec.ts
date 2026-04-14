import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available
import { RedikerAcademyPageLocators } from '../locators/RedikerAcademyPage.locators';
import { LandingPageLocators } from '../locators/LandingPage.locators';
import { LoadFormPageLocators } from '../locators/LoadFormPage.locators';

test('Recorded flow', async ({ page }) => {
  const L = {
    emailInput          : RedikerAcademyPageLocators.emailInput(page),
    enterYourPassword   : RedikerAcademyPageLocators.enterYourPassword(page),
    passwordInput       : RedikerAcademyPageLocators.passwordInput(page),
    loginButton         : RedikerAcademyPageLocators.loginButton(page),
    arjunTendulkar      : LandingPageLocators.arjunTendulkar(page),
    viewEditButton      : LandingPageLocators.viewEditButton(page),
    sachinTendulkar     : LoadFormPageLocators.sachinTendulkar(page),
    logOutLink          : LoadFormPageLocators.logOutLink(page),
  };

  await page.goto('https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await page.waitForLoadState('domcontentloaded');

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await L.emailInput.fill('sachin@sink.sendgrid.net');
  await L.passwordInput.fill(process.env.TEST_PASSWORD!);
  await L.loginButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Applicant/Landing');
  await L.arjunTendulkar.click();
  await L.viewEditButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm');
  await L.sachinTendulkar.click();
  await L.logOutLink.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
});