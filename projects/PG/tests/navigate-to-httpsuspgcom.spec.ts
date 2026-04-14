import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available
import { PageLocators } from '../locators/Page.locators';
import { Search-resultsPageLocators } from '../locators/Search-resultsPage.locators';

test('Recorded flow', async ({ page }) => {
  const L = {
    introButton         : PageLocators.introButton(page),
    searchHere          : PageLocators.searchHere(page),
    searchInput         : PageLocators.searchInput(page),
    blogLink            : Search-resultsPageLocators.blogLink(page),
  };

  await page.goto('https://www.pg.com');
  await page.waitForLoadState('domcontentloaded');

  await page.waitForURL('**https://us.pg.com/');
  await L.introButton.click();
  await L.introButton.click();
  await page.waitForLoadState('domcontentloaded');
  await L.searchHere.click();
  await L.searchHere.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForURL('**https://us.pg.com/search-results/?query=shampoo');
  await L.blogLink.click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForURL('**https://us.pg.com/blogs/');
});