import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executehilitiWorkflow } from '../actions/hiliti.actions';

test.describe('hiliti', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executehilitiWorkflow(page, TestData);
  });
});
