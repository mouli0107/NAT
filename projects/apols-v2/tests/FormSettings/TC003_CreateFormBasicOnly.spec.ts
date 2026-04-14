import { test, expect } from '@playwright/test';
import { TestData } from '../../fixtures/test-data';
import { executeTC003 } from '../../actions/business/FormSettings.actions';

test('TC003 — Create basic form without fee', async ({ page }) => {
  await executeTC003(page, TestData.TC003);
  await expect(page).toHaveURL(/CreateEditPages/);
});
