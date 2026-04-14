import { test } from '@playwright/test';
import { navigateTo } from '@actions/generic/browser.actions';
import { prepareSite } from '../helpers/universal';
import { 
  acceptCookies, 
  clickAIButton, 
  clickProductsButton, 
  clickResourcesButton, 
  clickWhySmartBearButton,
  navigateToApplicationIntegrity 
} from '@actions/business/smartbear.actions';
import { verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('SmartBear Website Navigation', () => {
  test('Navigate through main menu items and access Application Integrity page', async ({ page, context }) => {
    await navigateTo(page, testData.baseUrl);
    await prepareSite(page);
    
    await acceptCookies(page);
    await clickAIButton(page);
    await clickProductsButton(page);
    await clickResourcesButton(page);
    await clickWhySmartBearButton(page);
    await navigateToApplicationIntegrity(page);
    
    await verifyUrl(page, testData.applicationIntegrityUrl);
    await verifyVisible(page, testData.applicationIntegrityHeading);
  });
});