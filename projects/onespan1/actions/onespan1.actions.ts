import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { Digipass-fx-authenticatorsPage } from '../pages/Digipass-fx-authenticatorsPage';
import { Contact-usPage } from '../pages/Contact-usPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeonespan1Workflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com');
  await prepareSite(page);

  await page.waitForURL('**https://www.onespan.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=26abee28-bbec-4102-b9da-8744fedb7da5', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickFidoHardwareAuthenticatorsSt();
  await page.waitForURL('**https://www.onespan.com/products/digipass-fx-authenticators', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://player.vimeo.com/video/1051641614?controls=1&api=1&player_id=vimeo_id_1', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=26abee28-bbec-4102-b9da-8744fedb7da5', { waitUntil: 'domcontentloaded' });
  const digipass-fx-authenticatorsPage = new Digipass-fx-authenticatorsPage(page);
  await digipass-fx-authenticatorsPage.clickResources();
  await digipass-fx-authenticatorsPage.clickCommunityPortal();
  await page.waitForURL('**https://community.onespan.com/**', { waitUntil: 'domcontentloaded' });
  await digipass-fx-authenticatorsPage.clickCompany();
  await digipass-fx-authenticatorsPage.clickContactUs();
  await page.waitForURL('**https://www.onespan.com/contact-us', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://secure.onespan.com/index.php/form/XDFrame', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=26abee28-bbec-4102-b9da-8744fedb7da5', { waitUntil: 'domcontentloaded' });
  const contact-usPage = new Contact-usPage(page);
  await contact-usPage.clickFirstName();
  await contact-usPage.clickBusinessEmail();
  await contact-usPage.fillBusinessInterest('');
  await contact-usPage.fillCountry('');
  await contact-usPage.clickFirstName();
  await contact-usPage.fillLastName('mouli');
  await contact-usPage.fillTitle('test');
  await contact-usPage.fillCompanyName('tes');
  await contact-usPage.fillPhoneNumber('test');
  await contact-usPage.fillBusinessInterest('TID (IAA, RA, OCA)');
  await contact-usPage.fillCountry('AZ');
  await contact-usPage.clickCommentsOptional();
}
