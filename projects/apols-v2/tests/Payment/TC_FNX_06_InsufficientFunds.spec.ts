import { test } from '@playwright/test';
import { TC_FNX_06_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_06 — Insufficient funds (4000000000000069)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_06_Data);
});
