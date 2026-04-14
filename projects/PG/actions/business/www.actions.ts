import { Page } from '@playwright/test';
import { navigateTo, clickLink, waitForNetworkIdle } from '@actions/generic/browser.actions';
import { verifyUrl, verifyVisible } from '@actions/generic/assert.actions';
import { testData } from '@fixtures/test-data';

/**
 * Navigate through company information pages including Brands and Who We Are sections
 */
export async function navigateToCompanyInformation(page: Page, data = testData) {
  // Navigate to P&G homepage
  await navigateTo(page, data.baseUrl || 'https://us.pg.com/');
  await waitForNetworkIdle(page);
  
  // Verify homepage loaded successfully
  await verifyUrl(page, 'https://us.pg.com/');
  
  // Click on "Our Brands" in main navigation
  await clickLink(page, 'Our Brands');
  
  // Click "Brands" link from the dropdown menu
  await clickLink(page, 'Brands');
  await waitForNetworkIdle(page);
  
  // Verify navigation to Brands page - validates correct page loaded
  await verifyUrl(page, 'https://us.pg.com/brands/');
  
  // Navigate to Who We Are page
  await clickLink(page, 'Who We Are');
  await waitForNetworkIdle(page);
  
  // Verify Who We Are page loaded - validates company information is accessible
  await verifyUrl(page, 'https://us.pg.com/who-we-are/');
  await verifyVisible(page, 'See our impact');
}

/**
 * Explore community impact resources including local programs and filtered blog content
 */
export async function exploreCommunityImpactResources(page: Page, data = testData) {
  // Prerequisite: start from Who We Are page or navigate there first
  if (!page.url().includes('/who-we-are/')) {
    await navigateTo(page, 'https://us.pg.com/who-we-are/');
    await waitForNetworkIdle(page);
  }
  
  // Click "See our impact" link to navigate to Community Impact section
  await clickLink(page, 'See our impact');
  await waitForNetworkIdle(page);
  
  // Verify Community Impact page loaded - validates impact section is accessible
  await verifyUrl(page, 'https://us.pg.com/community-impact/');
  
  // Click "Local Programs" link to navigate to programs section
  await clickLink(page, 'Local Programs');
  await waitForNetworkIdle(page);
  
  // Verify hash navigation to local programs section - validates anchor navigation works
  await verifyUrl(page, 'https://us.pg.com/community-impact/#local-programs');
  
  // Click to view all blogs in Community Impact category
  await clickLink(page, 'View all blogs in Community Impact category');
  await waitForNetworkIdle(page);
  
  // Verify blogs page loaded with community impact filter - validates blog filtering functionality
  await verifyUrl(page, 'https://us.pg.com/blogs/#filter=community-impact');
}

/**
 * Complete end-to-end navigation from homepage through company info to community impact blogs
 */
export async function exploreCompanyImpactJourney(page: Page, data = testData) {
  // Navigate through company information pages
  await navigateToCompanyInformation(page, data);
  
  // Continue to explore community impact resources
  await exploreCommunityImpactResources(page, data);
  
  // Final verification - validates complete user journey through P&G impact content
  await verifyUrl(page, 'https://us.pg.com/blogs/#filter=community-impact');
}