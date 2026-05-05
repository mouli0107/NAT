import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateToProducts, verifyOnespan } from '@actions/business/onespan.actions';
import { verifyUrl, verifyVisible, verifyText } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('OneSpan Products Navigation', async () => {
  test('Navigate to Products section and verify product offerings are displayed', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);
    
    await navigateToProducts(page);
    
    await verifyOnespan(page);
  });
});