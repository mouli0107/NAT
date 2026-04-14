import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeSwaggertestingWorkflow } from '../actions/Swaggertesting.actions';

test.describe('Swagger testing', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeSwaggertestingWorkflow(page, TestData);
  });
});
