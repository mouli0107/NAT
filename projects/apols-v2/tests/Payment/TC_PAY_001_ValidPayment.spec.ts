import { test } from '@playwright/test';
import { TC_FNX_02_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_PAY_001 — Valid payment via email link (end to end)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_02_Data);
});
