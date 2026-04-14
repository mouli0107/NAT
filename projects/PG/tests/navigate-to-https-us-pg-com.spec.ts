import { test } from '@playwright/test';
import { navigateTo, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { 
  navigateToOurBrands, 
  navigateToBrandsPage, 
  navigateToWhoWeAre, 
  navigateToCommunityImpact, 
  clickLocalPrograms, 
  navigateToCommunityImpactBlogs 
} from '@actions/business/www.actions';
import { verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

test.describe('P&G Website Navigation', () => {
  test('Navigate through website sections to view community impact blogs', async ({ page }) => {
    await navigateTo(page, testData.baseUrl);
    
    await navigateToOurBrands(page);
    
    await navigateToBrandsPage(page);
    
    await navigateToWhoWeAre(page);
    
    await navigateToCommunityImpact(page);
    
    await clickLocalPrograms(page);
    
    await navigateToCommunityImpactBlogs(page);
    
    await verifyUrl(page, testData.communityImpactBlogsUrl);
    await verifyVisible(page, testData.communityImpactBlogsPageSelector);
  });
});