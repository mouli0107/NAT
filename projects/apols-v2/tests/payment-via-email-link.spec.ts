import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executePaymentviaemaillinkWorkflow } from '../actions/Paymentviaemaillink.actions';

test.describe('Payment via email link', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executePaymentviaemaillinkWorkflow(page, TestData);
  });
});
