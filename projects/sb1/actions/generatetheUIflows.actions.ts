import { Page } from '@playwright/test';

import { prepareSite } from '../helpers/universal';

export async function executegeneratetheUIflowsWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://smartbear.com/');
  await prepareSite(page);

}
