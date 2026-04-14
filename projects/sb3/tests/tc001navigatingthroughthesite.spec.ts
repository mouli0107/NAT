import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executeNavigatingthroughthesiteWorkflow } from '../actions/Navigatingthroughthesite.actions';

test.describe('Navigating through the site', () => {
  test('Execute recorded workflow', async ({ page }) => {
    await executeNavigatingthroughthesiteWorkflow(page, TestData);
  });
});
