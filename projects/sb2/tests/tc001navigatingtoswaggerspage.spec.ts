import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeNavigatingtoswaggerspageWorkflow } from '../actions/Navigatingtoswaggerspage.actions';

test.describe('Navigating to swagger's page', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeNavigatingtoswaggerspageWorkflow(page, TestData);
  });
});
