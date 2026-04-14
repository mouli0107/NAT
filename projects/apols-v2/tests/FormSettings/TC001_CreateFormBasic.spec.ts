import { test, expect } from '@playwright/test';
import { TestData } from '../../fixtures/test-data';
import { executeTC001 } from '../../actions/business/FormSettings.actions';
import { writeSharedContext } from '../../fixtures/shared-context';

test('TC001 — Create form with fee, date range, and 12-installment payment plan', async ({ page }) => {
  const formName = TestData.TC001.formName;
  console.log(`[TC001] Creating form: "${formName}" with 12 installments`);

  await executeTC001(page, TestData.TC001);

  // Write the form name to shared context so TC_PAY/TC_FNX tests can find it
  writeSharedContext({
    formName,
    createdAt: new Date().toISOString(),
  });

  console.log(`[TC001] ✅ Form "${formName}" created and shared context written`);
});
