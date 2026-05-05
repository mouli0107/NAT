import { test } from '@playwright/test';
import { getTestData } from '../fixtures/excel-reader';
import { executeparentloginWorkflow } from '../actions/parentlogin.actions';

const data = getTestData('TC001');

test.describe('TC001 — Parent Login', () => {
  test('Navigate to parent form and prepare site', async ({ page }) => {
    await executeparentloginWorkflow(page, data);
  });
});
