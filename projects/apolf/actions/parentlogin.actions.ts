import { Page } from '@playwright/test';

import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeparentloginWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm?formUID=3774a64b7abc4133b332d7a77c45d3f5&fToken=7F8C1DA7EF4434795F5F3AE2570023BEFF26A1901543A5B8619CFF334D314CA5&fapIDs=ZDGCLYlI7YM2ik%2FJtlJJtRPv%2BYZv%2BTQfytRW%2FMWnye0%3D');
  await prepareSite(page);

}
