import { Page } from '@playwright/test';

import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executet3eWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.nousinfosystems.com/');
  await prepareSite(page);

  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=jydjmpr11lut', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&co=aHR0cHM6Ly93d3cubm91c2luZm9zeXN0ZW1zLmNvbTo0NDM.&hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&size=normal&anchor-ms=20000&execute-ms=30000&cb=pyic5ch5i8i6', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA4vhBqjtuYUPjwGWi23WRzM0RRqelhPZUHK293IZMR5Raf7KTuPWAHTX8a5JQWR_9rSONoGkdQAgi9COw6KwK7Xp9gUZQ', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.google.com/recaptcha/api2/bframe?hl=en&v=gTpTIWhbKpxADzTzkcabhXN4&k=6Lfx6J8pAAAAALUqVNKR-jkdaEaPATlTaEjexaai&bft=0dAFcWeA7wX6sDJdDbv9FhOdYys8cptrSOPlS7HK7D20XogPy_v-N_9o6jRFbHjJ8332PBTXvhr7i14LnatFXmHtbyjqUqqneZyg', { waitUntil: 'domcontentloaded' });
}
