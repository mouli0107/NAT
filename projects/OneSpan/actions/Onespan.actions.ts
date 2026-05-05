import { Page } from '@playwright/test';

import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeOnespanWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://onespan.com');
  await prepareSite(page);

  await page.waitForURL('**https://www.onespan.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=7f571057-d0c2-4d39-84aa-4e41adfdaf34', { waitUntil: 'domcontentloaded' });
}
