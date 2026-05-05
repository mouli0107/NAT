import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { Contact-usPage } from '../pages/Contact-usPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetestWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com/');
  await prepareSite(page);

  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=68df4e6d-ced3-47cb-a5ab-5815ad1f05b2', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickResources();
  await wwwPage.clickSolutions();
  await wwwPage.clickCompany();
  await wwwPage.clickContactUs();
  await page.waitForURL('**https://www.onespan.com/contact-us', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://secure.onespan.com/index.php/form/XDFrame', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=68df4e6d-ced3-47cb-a5ab-5815ad1f05b2', { waitUntil: 'domcontentloaded' });
  const contact-usPage = new Contact-usPage(page);
  await contact-usPage.clickRequestDemo();
  await page.waitForURL('**https://www.onespan.com/products/request-a-demo', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://secure.onespan.com/index.php/form/XDFrame', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=68df4e6d-ced3-47cb-a5ab-5815ad1f05b2', { waitUntil: 'domcontentloaded' });
}
