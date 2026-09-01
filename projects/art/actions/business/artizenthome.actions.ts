import { Page } from '@playwright/test';
import { ArtizentHomePage } from '@pages/ArtizentHomePage';
import {waitForNetworkIdle} from '@actions/generic/browser.actions';
import { verifyUrl, verifyText } from '@actions/generic/assert.actions';
import { getTestData, TestDataRow } from '@fixtures/excel-reader';

/**
 * Clicks the hero "Explore Our Work" call-to-action and confirms navigation
 * to the case studies listing page.
 */
export async function exploreCaseStudiesFromHero(page: Page, data: TestDataRow): Promise<void> {
  const pgHome = new ArtizentHomePage(page);
  await pgHome.clickExploreOurWorkLink();
  await waitForNetworkIdle(page);
  await verifyUrl(page, '/insights/case-studies');
}

/**
 * Clicks the top navigation "Get in Touch" link and confirms navigation
 * to the contact page.
 */
export async function navigateToContactPage(page: Page, data: TestDataRow): Promise<void> {
  const pgHome = new ArtizentHomePage(page);
  await pgHome.clickGetInTouchLink();
  await waitForNetworkIdle(page);
  await verifyUrl(page, '/contact');
}

/**
 * Switches through the Enterprise AI Stack practice tabs and verifies each
 * tab's label becomes visible in the tab list.
 */
export async function reviewEnterpriseAiStackPractices(page: Page, data: TestDataRow): Promise<void> {
  const pgHome = new ArtizentHomePage(page);

  await pgHome.clickDataAnalyticsTab();
  await verifyText(page, 'Data & Analytics');

  await pgHome.clickAgenticEnterpriseTab();
  await verifyText(page, 'Agentic Enterprise');

  await pgHome.clickCloudCybersecurityTab();
  await verifyText(page, 'Cloud & Cybersecurity');
}

/**
 * Clicks the top navigation "Careers" link and confirms navigation to the
 * careers insights page.
 */
export async function navigateToCareersPage(page: Page, data: TestDataRow): Promise<void> {
  const pgHome = new ArtizentHomePage(page);
  await pgHome.clickCareersLink();
  await waitForNetworkIdle(page);
  await verifyUrl(page, '/insights/careers');
}