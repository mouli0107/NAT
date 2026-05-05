import { Page } from '@playwright/test';
import { WwwPage } from '../pages/WwwPage';
import { AuthenticationPage } from '../pages/AuthenticationPage';
import { Case-studyPage } from '../pages/Case-studyPage';
import { Request-a-demoPage } from '../pages/Request-a-demoPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeSignatureWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://www.onespan.com/');
  await prepareSite(page);

  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  const wwwPage = new WwwPage(page);
  await wwwPage.clickSolutions();
  await wwwPage.clickStrongCustomerAuthentication();
  await page.waitForURL('**https://www.onespan.com/products/authentication', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  const authenticationPage = new AuthenticationPage(page);
  await authenticationPage.clickGetStartedAboutAuthenticatio();
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=3283873c-c048-4172-9d54-078820dee520', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://www.onespan.com/resources/transforming-customer-experience-through-security/case-study', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=3283873c-c048-4172-9d54-078820dee520', { waitUntil: 'domcontentloaded' });
  const case-studyPage = new Case-studyPage(page);
  await case-studyPage.clickRequestDemo();
  await page.waitForURL('**https://www.onespan.com/products/request-a-demo', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://app.qualified.com/w/1/GvvvGdmiqjccvc7c/messenger?uuid=3283873c-c048-4172-9d54-078820dee520', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://secure.onespan.com/index.php/form/XDFrame', { waitUntil: 'domcontentloaded' });
  const request-a-demoPage = new Request-a-demoPage(page);
  await request-a-demoPage.clickFirstName();
  await request-a-demoPage.fillLastName('mouli');
  await request-a-demoPage.fillEmailAddress('mouli@mouli.com');
  await request-a-demoPage.fillCompanyName('mouli');
  await request-a-demoPage.fillPhoneNumber('232323232');
  await request-a-demoPage.clickCommentsOptional();
  await request-a-demoPage.clickSubmit();
  await request-a-demoPage.clickFirstName();
  await request-a-demoPage.fillLastName('moli');
  await page.waitForURL('**https://js.driftt.com/core/chat?d=1&region=US&driftEnableLog=false&pageLoadStartTime=1776322747871', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.driftt.com/core?d=1&embedId=hz4k6t4hkyz2&eId=hz4k6t4hkyz2&region=US&forceShow=false&skipCampaigns=false&sessionId=5010338d-340c-49f9-828e-9242680f9997&sessionStarted=1776322777.069&campaignRefreshToken=fa6057b4-3a42-4f24-b5a5-ea91524151d1&hideController=false&pageLoadStartTime=1776322747871&mode=CHAT&driftEnableLog=false&secureIframe=false&u=https%3A%2F%2Fwww.onespan.com%2Fproducts%2Frequest-a-demo', { waitUntil: 'domcontentloaded' });
  await request-a-demoPage.fillCompanyName('Microsoft');
  await request-a-demoPage.fillPhoneNumber('34333334343');
  await request-a-demoPage.clickSubmit();
  await page.waitForURL('**https://www.onespan.com/products/request-a-demo/thank-you', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://117146701.intellimizeio.com/storage.html', { waitUntil: 'domcontentloaded' });
}
