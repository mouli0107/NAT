import { test } from '@playwright/test';
import { TC_FNX_09_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_09 — Incorrect card number (4544206329536898)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_09_Data);
});
