import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeNousWorkflow } from '../actions/Nous.actions';

test.describe('Nous', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeNousWorkflow(page, TestData);
  });
});
