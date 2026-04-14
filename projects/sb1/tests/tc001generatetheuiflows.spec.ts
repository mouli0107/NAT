import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executegeneratetheUIflowsWorkflow } from '../actions/generatetheUIflows.actions';

test.describe('generate the UI flows', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executegeneratetheUIflowsWorkflow(page, TestData);
  });
});
