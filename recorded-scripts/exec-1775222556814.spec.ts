import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available

test('Recorded flow', async ({ page }) => {
  // ─── Object Repository (auto-captured during recording) ─────────────────
  // Edit locators here — all test steps reference these named variables.
  const L = {
    emailInput          : page.locator('#txtUserName'),
    //  ↳ [name] [name="email"]
    //  ↳ [xpath] xpath: //*[@id="txtUserName"]
    passwordInput       : page.locator('#txtUserPassword'),
    //  ↳ [name] [name="pwd"]
    //  ↳ [xpath] xpath: //*[@id="txtUserPassword"]
    loginButton         : page.locator('#btnLoginUser'),
    //  ↳ [role+text] page.getByRole('button', { name: 'Login', exact: false })
    //  ↳ [xpath] xpath: //*[@id="btnLoginUser"]
    viewEditButton      : page.locator('#btn_176'),
    //  ↳ [role+text] page.getByRole('button', { name: 'View/Edit', exact: false })
    //  ↳ [xpath] xpath: //*[@id="btn_176"]
    myPaymentsLink      : page.getByRole('link', { name: 'My Payments', exact: false }),
    //  ↳ [xpath] xpath: //*[@id="myInvoices"]/a
    showClosedInvoice   : page.locator('label[for="btnShowClosed"]'),
    //  ↳ [xpath] xpath: //label[@for="btnShowClosed"]
    btnshowclosedCheckbox: page.locator('#btnShowClosed'),
    //  ↳ [xpath] xpath: //*[@id="btnShowClosed"]
  };

  await page.goto('https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await page.waitForLoadState('domcontentloaded');

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/RedikerAcademy');
  await L.emailInput.fill('sachin@sink.sendgrid.net');
  await L.passwordInput.fill(process.env.TEST_PASSWORD!);
  await L.loginButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Applicant/Landing');
  await L.viewEditButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm');
  await L.myPaymentsLink.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Invoice/Invoice');
  await L.showClosedInvoice.click();
  await L.btnshowclosedCheckbox.check();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Invoice/Invoice');
});