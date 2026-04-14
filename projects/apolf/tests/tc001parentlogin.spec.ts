import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeparentloginWorkflow } from '../actions/parentlogin.actions';

test.describe('parent login', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeparentloginWorkflow(page, TestData);
  });
});
