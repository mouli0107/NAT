import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executetewtWorkflow } from '../actions/tewt.actions';

test.describe('tewt', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executetewtWorkflow(page, TestData);
  });
});
