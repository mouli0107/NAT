import { test, expect } from '@playwright/test';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators, smartFill, smartClick, smartCheck, smartUncheck, kendoSelect, kendoSelectDate, kendoMultiSelectAdd, kendoTreeToggle, kendoTreeSelect } from '../helpers/universal';

test('Recorded flow', async ({ page, context }) => {
  await page.goto('https://apc01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FAdmin%2FAdminLogin%3FschoolLink%3DOXFORDACADEMYBANGALORE&data=05%7C02%7Cchandramouli%40nousinfo.com%7C78e1152fd9fd4af0389808de9479be87%7C5a6c876cf9714b1491e5b14f89bb031d%7C0%7C0%7C639111447786266271%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=ayRK%2BZfEAPM%2BAwIFGiPlDrTIdzz8wu%2BnBMW21dOkFsE%3D&reserved=0');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditForms');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/FormSettings');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditPages?formId=358&formTypeId=1');
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
});