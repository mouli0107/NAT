import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executetewtsWorkflow } from '../actions/tewts.actions';

test.describe('tewts', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executetewtsWorkflow(page, TestData);
  });
});
