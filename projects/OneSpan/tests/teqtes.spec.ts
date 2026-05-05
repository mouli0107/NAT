import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executetesWorkflow } from '../actions/tes.actions';

test.describe('tes', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executetesWorkflow(page, TestData);
  });
});
