import { Page } from '@playwright/test';
import { InfrastructureManagementPage } from '../pages/InfrastructureManagementPage';
import { CareersPage } from '../pages/CareersPage';
import { ContactUsPage } from '../pages/ContactUsPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeNousWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.nousinfosystems.com');
  await prepareSite(page);

  await page.waitForURL('**https://www.nousinfosystems.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=gsa8y83yj9es', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=ofzkh7oqy9xo', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA55sie0U3448uLTiB46gdpFFYCkCd2iLapssAbRIeKQbKQP_AJnAM03uqZClQkxgefqdKZE_tJcmSQ_96myXvNMItefyg', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA4C4dvuyXDAcCTlMgL-QxvuRnsH7n2FJOoEJ2CM_WkhZezqynqxhMa7rNyBxftP9YdFuaKD0xuRM-5Tr_vDQ6O0BLF7gQ', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.nousinfosystems.com/services/infrastructure-management', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=oq5t2o8jri6d', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=q0k4f2onyugi', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA4q4YtCsECDLYPYJqSXGCVVKmpqYAN1Sizt9iGQu4VjvctO3u2PbRfhUjB1l4K5RvXs6Y9wbYbLOd1gUBJN3we_yFdlgw', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA54v37McFjB--FP7IcREEpg9yDE4h8tIyM1KNx2B1BnT5jDZYUs7WW2G06nvUzxCorvZspQVBknKNALGg3gCZ19PueeRQ', { waitUntil: 'domcontentloaded' });
  const infrastructureManagementPage = new InfrastructureManagementPage(page);
  await infrastructureManagementPage.clickCareers();
  await page.waitForURL('**https://www.nousinfosystems.com/careers', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=36ju03yn9dd1', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=rpcjpl1zxwaq', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=w7nq5buz82t2', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA4MdnQRCuz8gx50D44y19InPTNZbs98Pk_x-PgSw5jJbscacxqzz7oTKXsLjacPpw-ElZBkJM7N_7OnPcvgJuRXp6lQcQ', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA5VPKSPVh3ZKXIJH8SHJrGW7pvQsa3ZpZ1uO2m8QRySKz57vziH6QZCEehJ1yEq_0FLBijBIOOKzL2iQukGiik9hmbAQg', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA4FCYDs1MUSu0pJky3V8I798gkzFr7lHkHuIGqrYTz4fdyOeto67Bc5L_NXkSTBnKAijrt4DXLvbpJ-gemrHM2FVir3HQ', { waitUntil: 'domcontentloaded' });
  const careersPage = new CareersPage(page);
  await careersPage.clickContactUs();
  await page.waitForURL('**https://www.nousinfosystems.com/contact-us', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=xas1tsd2qrmt', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=lhceirpzl5v7', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA7nuDHxe9CzM5Zf1Vkgy2EJnMuujW8ZQ0kBqf9nd0Wsu6wN_R2wvbQ7X09fbYzLkD1FUdwa3gJacnJK7q1VGulU95yUaQ', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA7mNhMJbC-A2DG3LOU9Y8wwiRyq616fnUcGX6F5XFOGiZe6PV4jff8IhIgBjXb-3qy5k0r0mzvKJa7p19Dvs42iXkTRKQ', { waitUntil: 'domcontentloaded' });
  const contactUsPage = new ContactUsPage(page);
  await contactUsPage.fillName('chandra');
  await contactUsPage.fillEmail('mouli@mouli.com');
  await contactUsPage.fillPhoneNumber('434334343');
  await contactUsPage.fillCompanyName('mouli');
  await contactUsPage.fillMessage('mouli');
  await contactUsPage.enableCheckbox815();
  await page.waitForURL('**https://www.nousinfosystems.com/contact-us#wpcf7-f89-o1', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=gthsij1f4l4s', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=sznhbrk5z7bz', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA7HMRAFBH5y-sBqruPQFUfeFsylWUwGEsGwEaopcd_aCAcCpVy1tPWvI00nrl79fHAhVdH9ve80vfFN9-osATMn_FAQ6Q', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA5i7rTM_k1CnghRbmfmD5zDDoZ-DamPxeHtVpLJlwZmyCYCsT3kxhvI2IBAPop8rNfKKrbkku1RAjvDrGx3VBpQMQ5brg', { waitUntil: 'domcontentloaded' });
}
