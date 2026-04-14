import { test } from '@playwright/test';
import { TC_FNX_11_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_11 — ACH valid bank account payment (1099999999)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_11_Data);
});
