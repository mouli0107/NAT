import { Page } from '@playwright/test';
import { prepareSite, waitForPageReady, smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeBEARAIWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://smartbear.com/');
  await prepareSite(page);

  // ── Object Repository ──
  const L = {
    aiButton            : page.locator('xpath=//button[normalize-space(text())=\'AI\']').filter({ visible: true }).first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='AI']
    //  ↳ [relative-structural] xpath: //*[@id='nav-drawer']//button[normalize-space(text())='AI']
    smartbearAiExploreOurAiTechnLink: page.locator('xpath=//a[normalize-space(text())=\'SmartBear AI Explore our AI Technology\']').filter({ visible: true }).first(),
    //  ↳ [link-text] xpath: //a[normalize-space(text())='SmartBear AI Explore our AI Technology']
    learnMoreLink       : page.locator('xpath=//a[normalize-space(text())=\'Learn More\']').filter({ visible: true }).first(),
    //  ↳ [link-text] xpath: //a[normalize-space(text())='Learn More']
    //  ↳ [relative-structural] xpath: //*[@id='form']//a[normalize-space(text())='Learn More']
  };

  // ── Test Steps ──
  await page.waitForURL('**https://smartbear.com/', { waitUntil: 'domcontentloaded' });
  await smartClick(L.aiButton);
  await smartClick(L.smartbearAiExploreOurAiTechnLink);
  await page.waitForURL('**https://smartbear.com/ai/', { waitUntil: 'domcontentloaded' });
  await smartClick(L.learnMoreLink);
  await page.waitForURL('**https://smartbear.com/product/bearq/', { waitUntil: 'domcontentloaded' });
}
