import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators, smartFill } from '../helpers/universal';

test('Recorded flow', async ({ page, context }) => {
  // ─── Object Repository (auto-captured during recording) ─────────────────
  // Edit locators here — all test steps reference these named variables.
  const L = {
    emailInput          : page.locator('xpath=//*[@id=\'txtUserName\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtUserName']
    //  ↳ [name] xpath: //input[@name='email']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='Enter your email']/following-sibling::input[1]
    //  ↳ [relative-structural] xpath: //*[@id='frmLogin']//input[@name='email']
    //  ↳ [attr-combo] xpath: //input[@type='email' and @name='email']
    passwordInput       : page.locator('xpath=//*[@id=\'txtUserPassword\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtUserPassword']
    //  ↳ [name] xpath: //input[@name='pwd']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='Enter your password']/following-sibling::input[1]
    //  ↳ [relative-structural] xpath: //*[@id='frmLogin']//input[@name='pwd']
    //  ↳ [attr-combo] xpath: //input[@type='password' and @name='pwd']
    loginButton         : page.locator('xpath=//*[@id=\'btnLoginUser\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnLoginUser']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Login']
    //  ↳ [relative-structural] xpath: //*[@id='loginMainDiv']//button[normalize-space(text())='Login']
  };

  await page.goto('https://ap-forms.rediker.com/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://ap-forms.rediker.com/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await smartFill(L.emailInput, 'mahimagp@nousinfo.com');
  await smartFill(L.passwordInput, process.env.REDIKER_PASSWORD!);
  await L.loginButton.click();
  await page.waitForURL('**https://ap-forms.rediker.com/FormsManager/CreateEditForms');
});