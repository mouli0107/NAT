import { test } from '@playwright/test';
import { TC_FNX_08_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_08 — Incorrect CVC (4000056655665556)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_08_Data);
});
