import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeOnespanWorkflow } from '../actions/Onespan.actions';

test.describe('Onespan', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeOnespanWorkflow(page, TestData);
  });
});
