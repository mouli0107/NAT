import { test } from '@playwright/test';
import { TC_FNX_13_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_13 — Payment without saving card details', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_13_Data);
});
