import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executetrestWorkflow } from '../actions/trest.actions';

test.describe('trest', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executetrestWorkflow(page, TestData);
  });
});
