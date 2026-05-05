import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeSignatureWorkflow } from '../actions/Signature.actions';

test.describe('Signature', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeSignatureWorkflow(page, TestData);
  });
});
