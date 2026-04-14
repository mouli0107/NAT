import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executemakingpayemntWorkflow } from '../actions/makingpayemnt.actions';

test.describe('making payemnt', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executemakingpayemntWorkflow(page, TestData);
  });
});
