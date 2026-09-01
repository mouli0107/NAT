import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeHiltiWorkflow } from '../actions/Hilti.actions';

test.describe('Hilti', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeHiltiWorkflow(page, TestData);
  });
});
