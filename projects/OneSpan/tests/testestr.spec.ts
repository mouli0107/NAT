import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executetestrWorkflow } from '../actions/testr.actions';

test.describe('testr', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executetestrWorkflow(page, TestData);
  });
});
