import { test, expect } from '@playwright/test';
import { TestData } from '../../fixtures/test-data';
import { executeTC002 } from '../../actions/business/FormSettings.actions';

test('TC002 — Create form with fee payment only', async ({ page }) => {
  await executeTC002(page, TestData.TC002);
  await expect(page).toHaveURL(/CreateEditPages/);
});
