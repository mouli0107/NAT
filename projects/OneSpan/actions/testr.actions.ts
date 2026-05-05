import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executetestrWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com/');
  await prepareSite(page);

  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=3c41d01a-b22c-4580-a037-75f245fa2d02', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickResources();
  await wwwPage.clickSolutions();
  await wwwPage.clickSolutions();
  await wwwPage.clickSolutions();
  await wwwPage.clickSolutions();
  await wwwPage.clickSolutions();
  await wwwPage.clickResources();
  await wwwPage.clickResources();
  await wwwPage.clickResources();
  await wwwPage.clickResources();
  await wwwPage.clickPricing();
  await wwwPage.clickResources();
}
