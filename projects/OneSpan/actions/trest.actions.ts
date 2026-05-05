import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetrestWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com/');
  await prepareSite(page);

  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=dba35186-3388-4d2d-bf39-d8017a2e83fe', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickResources();
}
