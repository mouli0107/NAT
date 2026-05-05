import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeshourgardWorkflow } from '../actions/shourgard.actions';

test.describe('shourgard', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeshourgardWorkflow(page, TestData);
  });
});
