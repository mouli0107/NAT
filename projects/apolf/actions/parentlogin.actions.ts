import { Page } from '@playwright/test';
import { prepareSite } from '../helpers/universal';
import { TestDataRow } from '../fixtures/excel-reader';

export async function executeparentloginWorkflow(
  page: Page,
  data: TestDataRow
): Promise<void> {
  await page.goto(data.startUrl || data.baseUrl);
  await prepareSite(page);
}
