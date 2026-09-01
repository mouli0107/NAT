import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executete4sWorkflow } from '../actions/te4s.actions';

test.describe('te4s', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executete4sWorkflow(page, TestData);
  });
});
