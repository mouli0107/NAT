import { test } from '@playwright/test';
import { getTestData } from '../fixtures/excel-reader';
import { executeparentlogin1Workflow } from '../actions/parentlogin1.actions';

const data = getTestData('TC0011');

test.describe('TC0011 — Parent Login & Payment Flow', () => {
  test('Submit applicant form and complete payment', async ({ page }) => {
    await executeparentlogin1Workflow(page, data);
  });
});
