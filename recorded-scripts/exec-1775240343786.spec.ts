import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env so TEST_PASSWORD and other env vars are available

test('Recorded flow', async ({ page }) => {
  // ─── Object Repository (auto-captured during recording) ─────────────────
  // Edit locators here — all test steps reference these named variables.
  const L = {
    ourBrands           : page.locator('xpath=//*[@id="global-navigation-header"]/ul/li[1]/div/span'),
    brandsLink          : page.getByRole('link', { name: 'Brands', exact: false }),
    //  ↳ [xpath] xpath: //*[@id="global-navigation-header"]/ul/li[1]/ul/li[1]/a
    whoWeAreLink        : page.getByRole('link', { name: 'Who We Are', exact: false }),
    //  ↳ [xpath] xpath: //*[@id="global-navigation-header"]/ul/li[3]/ul/li[1]/a
    seeOurImpactLink    : page.getByRole('link', { name: 'See our impact', exact: false }),
    //  ↳ [xpath] xpath: //*[@id="page-content"]/section[1]/div/div[3]/div[2]/a
    localProgramsLink   : page.getByRole('link', { name: 'Local Programs', exact: false }),
    //  ↳ [xpath] xpath: //*[@id="page-content"]/div[4]/div/div[3]/a
    viewAllLink         : page.getByLabel('View all blogs in Community Impact category', { exact: false }),
    //  ↳ [role+text] page.getByRole('link', { name: 'View all', exact: false })
    //  ↳ [xpath] xpath: //*[@id="page-content"]/div[6]/a
  };

  await page.goto('https://www.pg.com');
  await page.waitForLoadState('domcontentloaded');

  await page.waitForURL('**https://us.pg.com/');
  await L.ourBrands.click();
  await L.brandsLink.click();
  await page.waitForURL('**chrome-error://chromewebdata/');
  await page.waitForURL('**https://us.pg.com/brands/');
  await L.whoWeAreLink.click();
  await page.waitForURL('**https://us.pg.com/brands/');
  await page.waitForURL('**https://us.pg.com/who-we-are/');
  await L.seeOurImpactLink.click();
  await page.waitForURL('**https://us.pg.com/community-impact/');
  await L.localProgramsLink.click();
  await page.waitForURL('**https://us.pg.com/community-impact/#local-programs');
  await page.waitForURL('**/community-impact/');
  await L.viewAllLink.click();
  await page.waitForURL('**https://us.pg.com/blogs/#filter=community-impact');
});