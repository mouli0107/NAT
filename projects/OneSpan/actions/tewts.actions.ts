import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { Contact-usPage } from '../pages/Contact-usPage';
import { Request-a-demoPage } from '../pages/Request-a-demoPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetewtsWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com/');
  await prepareSite(page);

  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=c65bbd0c-e270-4e07-bc78-e94da5291ba2', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickSolutions();
  await wwwPage.clickResources();
  await wwwPage.clickCompany();
  await wwwPage.clickContactUs();
  await page.waitForURL('**https://www.onespan.com/contact-us', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://secure.onespan.com/index.php/form/XDFrame', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=c65bbd0c-e270-4e07-bc78-e94da5291ba2', { waitUntil: 'domcontentloaded' });
  const contact-usPage = new Contact-usPage(page);
  await contact-usPage.clickRequestDemo();
  await page.waitForURL('**https://www.onespan.com/products/request-a-demo', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://secure.onespan.com/index.php/form/XDFrame', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=c65bbd0c-e270-4e07-bc78-e94da5291ba2', { waitUntil: 'domcontentloaded' });
  const request-a-demoPage = new Request-a-demoPage(page);
  await request-a-demoPage.clickBusinessEmail();
  await request-a-demoPage.fillCountry('');
  await request-a-demoPage.fillBusinessInterest('');
  await request-a-demoPage.clickFirstName();
  await request-a-demoPage.fillLastName('mouli');
  await request-a-demoPage.fillCompanyName('sdfd');
  await request-a-demoPage.clickPhone();
  await request-a-demoPage.fillCountry('AT');
  await request-a-demoPage.fillBusinessInterest('OneSpan Sign');
  await request-a-demoPage.clickCommentsOptional();
  await request-a-demoPage.clickMktocheckbox2406770();
  await request-a-demoPage.clickSubmit();
}
