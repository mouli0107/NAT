import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeBEARAIWorkflow } from '../actions/BEARAI.actions';

test.describe('BEARAI', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeBEARAIWorkflow(page, TestData);
  });
});
