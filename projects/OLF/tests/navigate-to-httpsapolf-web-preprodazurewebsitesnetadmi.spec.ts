import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executepublishingformWorkflow } from '../actions/publishingform.actions';

test.describe('publishing form', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executepublishingformWorkflow(page, TestData);
  });
});
