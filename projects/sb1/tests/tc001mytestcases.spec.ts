import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executemytestcasesWorkflow } from '../actions/mytestcases.actions';

test.describe('my test cases', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executemytestcasesWorkflow(page, TestData);
  });
});
