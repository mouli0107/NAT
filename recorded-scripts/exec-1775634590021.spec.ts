import { test, expect } from '@playwright/test';
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
    loginButton         : page.locator('xpath=//*[@id=\'btnLoginUser\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnLoginUser']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Login']
    //  ↳ [relative-structural] xpath: //*[@id='loginMainDiv']//button[normalize-space(text())='Login']
    settingsButton      : page.locator('xpath=//button[normalize-space(text())=\'Settings\']').filter({ visible: true }).first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Settings']
    //  ↳ [relative-structural] xpath: //*[@id='frameButtons']//button[normalize-space(text())='Settings']
  };

  await page.goto('https://apc01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FAdmin%2FAdminLogin%3FschoolLink%3DOXFORDACADEMYBANGALORE&data=05%7C02%7Cchandramouli%40nousinfo.com%7C78e1152fd9fd4af0389808de9479be87%7C5a6c876cf9714b1491e5b14f89bb031d%7C0%7C0%7C639111447786266271%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=ayRK%2BZfEAPM%2BAwIFGiPlDrTIdzz8wu%2BnBMW21dOkFsE%3D&reserved=0');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await smartFill(L.emailInput, 'mahimagp@nousinfo.com');
  await L.loginButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditForms');
  await L.settingsButton.click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/FormSettings');
  await page.locator('xpath=//a[normalize-space(text())=\'a\']').filter({ visible: true }).first().click();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
});