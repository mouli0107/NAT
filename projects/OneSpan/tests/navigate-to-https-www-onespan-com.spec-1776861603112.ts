import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { navigateToHomepage, verifyOnespan } from '@actions/business/onespan.actions';
import { verifyUrl } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('OneSpan Homepage Navigation', () => {
  test('Navigate to OneSpan homepage and verify page loads', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);

    await navigateToHomepage(page);
    await verifyOnespan(page);

    await verifyUrl(page, testData.baseUrl);
  });
});