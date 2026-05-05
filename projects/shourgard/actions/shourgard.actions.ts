import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CustomerSearchPage } from '../pages/CustomerSearchPage';
import { CustomerInquiryListPage } from '../pages/CustomerInquiryListPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executeshourgardWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'http://172.25.1.238:83/dashboard');
  await prepareSite(page);

  await page.waitForURL('**http://172.25.1.238:83/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**http://172.25.1.238:83/login', { waitUntil: 'domcontentloaded' });
  const loginPage = new LoginPage(page);
  await loginPage.clickUsername();
  await loginPage.fillUsername('parthasarathyh');
  await loginPage.clickPassword();
  await page.waitForURL('**http://172.25.1.238:83/dashboard', { waitUntil: 'domcontentloaded' });
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.fillPassword('Shurgard@789');
  await page.waitForURL('**http://172.25.1.238:83/customer-search', { waitUntil: 'domcontentloaded' });
  const customerSearchPage = new CustomerSearchPage(page);
  await customerSearchPage.fillFirstName('Harsh');
  await customerSearchPage.fillSelectcustomertype('0');
  await customerSearchPage.clickSearch();
  await page.waitForURL('**http://172.25.1.238:83/customer-management/customer-information/9378117', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**http://172.25.1.238:83/customer-management/customer-inquiry-list/9378117', { waitUntil: 'domcontentloaded' });
  const customerInquiryListPage = new CustomerInquiryListPage(page);
  await customerInquiryListPage.clickInquiry1();
  await customerInquiryListPage.fillDdMmYyyy('');
  await customerInquiryListPage.fillEditwhat(' i require extra space');
  await customerInquiryListPage.clickSave();
}
