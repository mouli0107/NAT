import { test } from '@playwright/test';
import { TC_FNX_02_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_02 — Complete payment from email (valid card 4242424242424242)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_02_Data);
});
