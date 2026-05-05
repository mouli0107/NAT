import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeOnespan123Workflow } from '../actions/Onespan123.actions';

test.describe('Onespan123', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeOnespan123Workflow(page, TestData);
  });
});
