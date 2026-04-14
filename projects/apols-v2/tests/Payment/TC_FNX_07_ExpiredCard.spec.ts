import { test } from '@playwright/test';
import { TC_FNX_07_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_07 — Expired card (4000000000009987)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_07_Data);
});
