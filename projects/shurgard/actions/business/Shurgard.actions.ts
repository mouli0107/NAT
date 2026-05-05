import { Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { CustomerSearchPage } from '../../pages/CustomerSearchPage';
import { CustomerAdditionPage } from '../../pages/CustomerAdditionPage';
import { CustomerInquiryListPage } from '../../pages/CustomerInquiryListPage';
import { CustomerInquiryDetailPage } from '../../pages/CustomerInquiryDetailPage';
import { TestData } from '../../fixtures/test-data';

// ── TC001: Login (happy path) ─────────────────────────────────────────────────
export async function loginToShurgard(
  page: Page,
  username = TestData.username,
  password = TestData.password
) {
  await page.goto(TestData.startUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('#exampleInputEmail1', { state: 'visible', timeout: 60000 });

  const loginPage = new LoginPage(page);
  await loginPage.fillUsername(username);
  await loginPage.fillPassword(password);
  await loginPage.clickLogin();

  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
}

// ── TC001: Attempt login (negative tests) ────────────────────────────────────
// Does NOT wait for dashboard URL. Caller asserts the resulting URL / error.
// Returns the error message text shown by the app (empty string if none).
export async function attemptLogin(
  page: Page,
  username: string,
  password: string
): Promise<string> {
  await page.goto(TestData.startUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('#exampleInputEmail1', { state: 'visible', timeout: 60000 });

  const loginPage = new LoginPage(page);
  await loginPage.fillUsername(username);
  await loginPage.fillPassword(password);

  // Silently absorb if button is disabled (e.g. empty username)
  try {
    await loginPage.clickLogin();
  } catch {
    // Button disabled — page stays on login (expected for negative tests)
    return '';
  }

  // Wait briefly for any navigation or error message to appear
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  // Return the error message text if shown, otherwise empty string
  try {
    return await loginPage.waitForErrorMessage(10000);
  } catch {
    return '';
  }
}

// ── TC002: Select Location ────────────────────────────────────────────────────
// After login the app shows a country + store picker.
// After store selection the URL stays at /dashboard — tiles load.
// Does NOT navigate to customer-search (that requires clicking the tile).
export async function selectLocation(
  page: Page,
  _country  = TestData.country,
  _location = TestData.location
) {
  const dashboardPage = new DashboardPage(page);

  // Dismiss session-expired modal if parallel tests caused it
  await dashboardPage.dismissSessionExpired();

  // Step 1: Country picker
  await page.waitForSelector(
    "xpath=//*[self::div or self::li or self::span][normalize-space(text())='Belgium']",
    { state: 'visible', timeout: 30000 }
  );
  await dashboardPage.selectBelgium();

  // Step 2: Store picker (angular list, not real <td>)
  await page.waitForSelector(
    "xpath=//*[normalize-space(text())='(P2PHUT) Bruxelles - Forest']",
    { state: 'visible', timeout: 30000 }
  );
  await dashboardPage.selectP2phutBruxellesForest();

  // Wait for the app to process the store selection.
  // Two reliable signals (both in main DOM, not inside lazily-loaded tiles):
  //   1. Store name in page header ("001 - (P2PHUT) Bruxelles - Forest")
  //   2. Sidebar nav link a[href="/customer-search"] becomes visible
  await page.waitForSelector(
    "xpath=//*[contains(normalize-space(text()),'Bruxelles - Forest')]",
    { state: 'visible', timeout: 80000 }
  );
  // Also wait for sidebar nav to confirm dashboard is fully interactive
  await page.waitForSelector('a[href="/customer-search"]', { state: 'visible', timeout: 80000 })
    .catch(() => {}); // non-fatal — header confirmation above is sufficient
  await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});
}

// ── TC002b: Navigate to Customer Search ──────────────────────────────────────
// Must be called AFTER selectLocation.
//
// DOM extraction confirmed the sidebar nav always contains:
//   <a href="/customer-search" routerlinkactive="active" _ngcontent-c6="">
// Clicking this link is the most reliable path — the lazy-loaded dashboard tiles
// are NOT needed. The sidebar link is always present once the location is selected.
export async function navigateToCustomerSearch(page: Page) {
  const dashboardPage = new DashboardPage(page);

  // Primary: click the sidebar navigation link confirmed by DOM extraction
  const sidebarLink = page.locator('a[href="/customer-search"]').filter({ visible: true }).first();
  const linkVisible = await sidebarLink.isVisible({ timeout: 10000 }).catch(() => false);

  if (linkVisible) {
    await sidebarLink.click();
    await page.waitForURL('**/customer-search', { waitUntil: 'domcontentloaded', timeout: 80000 });
    return;
  }

  // Fallback: use the DashboardPage method (tries text/xpath/frame strategies)
  await dashboardPage.clickCustomerManagement();
  await page.waitForLoadState('domcontentloaded', { timeout: 80000 }).catch(() => {});

  // If we landed somewhere with a customer-search link, click it
  if (!page.url().includes('customer-search')) {
    const subLink = page.locator('a[href="/customer-search"], a[href*="customer-search"]')
      .filter({ visible: true }).first();
    const subVisible = await subLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (subVisible) {
      await subLink.click();
      await page.waitForURL('**/customer-search', { waitUntil: 'domcontentloaded', timeout: 80000 });
      return;
    }
  }

  // Final confirmation: wait for the search input to appear
  await page.locator('#quantity1').waitFor({ state: 'visible', timeout: 80000 });
}

// ── TC003: Add New Customer ───────────────────────────────────────────────────
export async function addNewCustomer(
  page: Page,
  customerData = TestData.TC003
) {
  const customerSearchPage = new CustomerSearchPage(page);
  await customerSearchPage.clickNewCustomer();

  await page.waitForURL('**/customer-management/customer-addition', { waitUntil: 'domcontentloaded', timeout: 80000 });

  const customerAdditionPage = new CustomerAdditionPage(page);
  await customerAdditionPage.selectEnglishLanguage();
  if (customerData.title) {
    await customerAdditionPage.selectTitle(customerData.title);
  }
  await customerAdditionPage.fillFirstName(customerData.firstName);
  await customerAdditionPage.fillLastName(customerData.lastName);
  if (customerData.dateOfBirth) {
    await customerAdditionPage.fillDateOfBirth(customerData.dateOfBirth);
  }
  await customerAdditionPage.fillPhoneNumber(customerData.phoneNumber);
  await customerAdditionPage.fillEmail(customerData.email);
  await customerAdditionPage.clickSave();

  // After Save, three outcomes are possible:
  //   1. Form validation error → stays on customer-addition (negative test cases)
  //   2. New customer created → navigates to customer-information/{id}
  //   3. Duplicate detected → "Duplicate Identified Customer" modal appears

  // Give the app 10s to react, then check which path we're on
  let isDuplicate = false;
  try {
    await Promise.race([
      page.waitForURL('**/customer-management/customer-information/**', {
        waitUntil: 'domcontentloaded', timeout: 10000,
      }),
      page.waitForSelector(
        "xpath=//*[contains(normalize-space(.),'Duplicate Identified Customer')]",
        { state: 'visible', timeout: 10000 }
      ).then(() => { isDuplicate = true; }),
    ]);
  } catch {
    // Neither fired in 10 s
  }

  // Case 1: validation error — still on customer-addition → return and let test assert
  if (!isDuplicate && page.url().includes('customer-addition')) {
    return;
  }

  // Case 2: already navigated to customer-information → done
  if (page.url().includes('customer-information')) {
    return;
  }

  if (isDuplicate) {
    // The modal table has columns: Customer ID | Customer Name | Company Name | Customer Status | Details
    // Try clicking an anchor/button in the Details cell (last cell of first row).
    // If that cell has no link, click the entire first row — Angular routerLink on <tr> triggers navigation.
    const firstRow = page.locator(
      "xpath=//table[.//th[normalize-space(.)='Customer ID']]//tbody/tr[1]"
    ).filter({ visible: true }).first();

    const detailsLink = firstRow.locator('td:last-child a, td:last-child button').first();

    const hasDetailsLink = await detailsLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDetailsLink) {
      await detailsLink.click();
    } else {
      // Row itself may be clickable (Angular routerLink on <tr>)
      await firstRow.click();
    }

    // After the row click the app makes an API call before showing the "Discard Changes" modal.
    // On VPN this API call takes 30-60 seconds, so we must wait up to 80s.
    //
    // Root cause of previous failures: Bootstrap 3 hides all modals with display:none.
    // Playwright's hasText/isVisible return WRONG results for hidden elements (innerText="").
    // The fix: use waitForFunction() to poll until .modal.in (visible Bootstrap modal)
    // containing "discard" appears, THEN use page.evaluate() to click the button by textContent.
    // textContent works on hidden/visible elements; we also check offsetParent != null for safety.

    const discardAppeared = await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.modal.in, .modal.show')).some(
        (m: Element) => m.innerHTML.toLowerCase().includes('discard')
      ),
      { timeout: 80000 }
    ).then(() => true).catch(() => false);

    if (discardAppeared) {
      await page.evaluate(() => {
        const activeModals = Array.from(document.querySelectorAll('.modal.in, .modal.show'));
        for (const modal of activeModals) {
          if (modal.innerHTML.toLowerCase().includes('discard')) {
            const btn = Array.from(modal.querySelectorAll('button')).find(
              (b: Element) => ((b as HTMLButtonElement).textContent || '').trim() === 'DISCARD CHANGES'
            ) as HTMLButtonElement | undefined;
            if (btn) { btn.click(); break; }
          }
        }
      });
    }
  }

  // Wait for the final URL — whether from new customer creation or duplicate navigation
  await page.waitForURL('**/customer-management/customer-information/**', {
    waitUntil: 'domcontentloaded', timeout: 80000,
  });
}

// ── TC004: Search Customer ────────────────────────────────────────────────────
// Must be called AFTER navigateToCustomerSearch().
// Fills the search form, submits, then clicks the matching customer result row.
// Returns the extracted customer ID from the resulting URL.
export async function searchAndSelectCustomer(
  page: Page,
  customerData = TestData.TC004
): Promise<string> {
  const customerSearchPage = new CustomerSearchPage(page);

  // Fill search fields
  await customerSearchPage.fillFirstName(customerData.firstName);
  await customerSearchPage.selectCustomerType(customerData.customerType);
  await customerSearchPage.clickSearch();

  // Wait for search results to load
  await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

  // Click the matching customer result
  await customerSearchPage.clickCustomerResult(customerData.customerName);

  // Wait for navigation to customer information page
  await page.waitForURL('**/customer-management/customer-information/**', {
    waitUntil: 'domcontentloaded', timeout: 80000,
  });

  // Extract and return the customer ID from the URL
  const url = page.url();
  const match = url.match(/customer-information\/(\d+)/);
  return match?.[1] ?? '';
}

// ── TC005: Customer Inquiry ───────────────────────────────────────────────────
// Must be called AFTER searchAndSelectCustomer() — page must be on customer-information.
// Navigates to the inquiry list, opens the specified inquiry, fills the form and saves.
export async function updateCustomerInquiry(
  page: Page,
  inquiryData = TestData.TC005
): Promise<void> {
  // Extract customer ID from current URL
  const url = page.url();
  const match = url.match(/customer-information\/(\d+)/);
  const customerId = match?.[1];
  if (!customerId) {
    throw new Error(`Could not extract customer ID from URL: ${url}`);
  }

  // Navigate directly to inquiry list for this customer
  await page.goto(`/customer-management/customer-inquiry-list/${customerId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 80000,
  });
  await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

  // Click the target inquiry
  const customerInquiryListPage = new CustomerInquiryListPage(page);
  await customerInquiryListPage.clickInquiry(inquiryData.inquiryName);
  await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

  // Fill the inquiry detail form
  const detailPage = new CustomerInquiryDetailPage(page);

  if (inquiryData.needDate) {
    await detailPage.fillNeedDate(inquiryData.needDate);
  }
  if (inquiryData.inquiryWhy) {
    await detailPage.selectInquiryWhy(inquiryData.inquiryWhy);
  }
  if (inquiryData.inquiryWhyDetail) {
    await detailPage.fillInquiryWhyDetail(inquiryData.inquiryWhyDetail);
  }
  if (inquiryData.editWhat) {
    await detailPage.fillEditWhat(inquiryData.editWhat);
  }
  if (inquiryData.inquiryObjection) {
    await detailPage.selectInquiryObjection(inquiryData.inquiryObjection);
  }
  if (inquiryData.inquiryObjectionDetail) {
    await detailPage.fillInquiryObjectionDetail(inquiryData.inquiryObjectionDetail);
  }
  if (inquiryData.inquiryOCObjection) {
    await detailPage.selectInquiryOCObjection(inquiryData.inquiryOCObjection);
  }
  if (inquiryData.inquiryOCObjectionDetail) {
    await detailPage.fillInquiryOCObjectionDetail(inquiryData.inquiryOCObjectionDetail);
  }

  await detailPage.clickSave();
  await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});
}
