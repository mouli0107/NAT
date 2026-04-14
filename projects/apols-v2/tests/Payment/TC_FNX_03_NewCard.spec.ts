import { test } from '@playwright/test';
import { TC_FNX_03_Data } from '../../fixtures/test-data';
import { executeTC_PAY_001 } from '../../actions/business/PaymentViaEmailLink.actions';

test('TC_FNX_03 — Payment with new card (4000000760000002)', async ({ page }) => {
  await executeTC_PAY_001(page, TC_FNX_03_Data);
});
