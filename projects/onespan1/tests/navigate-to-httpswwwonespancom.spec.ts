import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeonespan1Workflow } from '../actions/onespan1.actions';

test.describe('onespan1', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeonespan1Workflow(page, TestData);
  });
});
