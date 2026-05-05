import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetewtWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com/');
  await prepareSite(page);

  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=cef77aa8-0a89-424d-8200-8831eba3f62d', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickProducts();
}
