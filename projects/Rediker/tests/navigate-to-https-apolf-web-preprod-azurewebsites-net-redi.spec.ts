import { test } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { login, selectApplicant, viewEditApplicant, logout } from '@actions/business/auth.actions';
import { verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('Applicant Management', () => {
  test('Login, view and edit applicant profile, then logout successfully', async ({ page }) => {
    await navigateTo(page, testData.baseUrl);
    
    await login(page, testData.username, testData.password);
    await verifyUrl(page, testData.applicantLandingUrl);
    
    await selectApplicant(page, testData.applicantName);
    
    await viewEditApplicant(page);
    await verifyUrl(page, testData.applicantFormUrl);
    
    await logout(page);
    await verifyUrl(page, testData.baseUrl);
  });
});