import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executet3eWorkflow } from '../actions/t3e.actions';

test.describe('t3e', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executet3eWorkflow(page, TestData);
  });
});
