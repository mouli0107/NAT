import { Page } from '@playwright/test';
import { WwwPage } from '@pages/WwwPage';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyText, verifyUrl, verifyVisible, verifyEnabled, verifyDisabled,
         verifyChecked, verifyUnchecked, verifyInputValue, verifyInputContains,
         verifyAttribute, verifyCount } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

export async function navigateToHomepage(page: Page, data = testData): Promise<void> {
  await navigateTo(page, data.baseUrl);
  await waitForNetworkIdle(page);
  await verifyUrl(page, data.baseUrl);
}

export async function verifyOnespan(page: Page): Promise<void> {
  // Assert "Solution " is visible
  await verifyText(page, 'Solution');
  // Assert text contains "FIDO Hardware Authenticator" on page
  await verifyText(page, 'FIDO Hardware Authenticator');
  // Assert text contains "Mobile Authentication" on page
  await verifyText(page, 'Mobile Authentication');
}