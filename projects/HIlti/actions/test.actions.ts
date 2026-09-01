import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetestWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.hilti.com/');
  await prepareSite(page);

  const wwwPage = new WwwPage(page);
  await wwwPage.clickAgreeAgreeToOurDataProcessin();
  await wwwPage.clickCompany();
  await wwwPage.clickPreReleaE();
  await page.waitForURL('**https://www.hilti.com/content/company/press-releases', { waitUntil: 'domcontentloaded' });
}
