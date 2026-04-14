import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeparentlogin1Workflow } from '../actions/parentlogin1.actions';

test.describe('parent login1', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeparentlogin1Workflow(page, TestData);
  });
});
