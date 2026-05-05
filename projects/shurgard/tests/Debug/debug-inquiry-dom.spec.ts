/**
 * DOM Extraction Debug — TC004/TC005
 *
 * Extracts the exact DOM structure for:
 *   1. Customer Search form + results table
 *   2. Customer Inquiry List page
 *   3. Customer Inquiry Detail form
 *
 * Run:  npx playwright test tests/Debug/debug-inquiry-dom.spec.ts --headed
 */
import { test } from '@playwright/test';
import { loginToShurgard, selectLocation, navigateToCustomerSearch } from '../../actions/business/Shurgard.actions';

test.describe.configure({ mode: 'serial' });

test('DOM: Customer Search form + results', async ({ page }) => {
  await loginToShurgard(page);
  await selectLocation(page);
  await navigateToCustomerSearch(page);

  // Extract search form structure
  const formHtml = await page.evaluate(() => {
    const form = document.querySelector('form') ?? document.querySelector('.search-form, [class*="search"]');
    if (form) return form.outerHTML;
    // Fallback: return all inputs + selects on the page
    return Array.from(document.querySelectorAll('input, select, button'))
      .map(el => el.outerHTML).join('\n');
  });
  console.log('\n=== CUSTOMER SEARCH FORM ===\n', formHtml);

  // Try to fill firstName and check the field
  const firstNameField = await page.evaluate(() => {
    const el = document.querySelector("input[name='fname']");
    if (el) return `FOUND: ${el.outerHTML}`;
    return 'NOT FOUND: input[name="fname"]';
  });
  console.log('\n=== firstName (fname) ===\n', firstNameField);

  const customerTypeField = await page.evaluate(() => {
    const byName = document.querySelector("select[name='selectCustomerType']");
    const byId   = document.querySelector("select#selectCustomerType");
    return {
      byName: byName?.outerHTML ?? 'NOT FOUND by name',
      byId:   byId?.outerHTML   ?? 'NOT FOUND by id',
    };
  });
  console.log('\n=== customerType select ===\n', JSON.stringify(customerTypeField, null, 2));

  // Fill and search — capture results table
  await page.locator("xpath=//input[@name='fname']").waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  const fnameVisible = await page.locator("xpath=//input[@name='fname']").isVisible().catch(() => false);

  if (fnameVisible) {
    await page.locator("xpath=//input[@name='fname']").fill('Harsh');

    // Select customer type if exists
    const ctVisible = await page.locator("xpath=//select[@name='selectCustomerType']").isVisible().catch(() => false);
    if (ctVisible) {
      await page.locator("xpath=//select[@name='selectCustomerType']").selectOption('0');
    }

    // Click SEARCH
    const searchBtn = page.locator(
      "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'search')]"
    ).filter({ visible: true }).first();
    await searchBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

    // Extract results table
    const resultsHtml = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) return table.outerHTML.substring(0, 3000);
      return 'No <table> found — page HTML snippet:\n' + document.body.innerHTML.substring(0, 2000);
    });
    console.log('\n=== SEARCH RESULTS TABLE ===\n', resultsHtml);

    // Check for customer result link
    const resultLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).filter(a =>
        a.textContent?.includes('Harsh') || a.textContent?.includes('Joshi')
      );
      return links.map(a => a.outerHTML).join('\n') || 'No matching customer link found';
    });
    console.log('\n=== CUSTOMER RESULT LINKS ===\n', resultLink);
  } else {
    console.log('\n⚠️  input[name="fname"] NOT visible — check #quantity1 vs fname distinction');
    const allInputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).map(el => el.outerHTML).join('\n')
    );
    console.log('\n=== ALL INPUTS ON SEARCH PAGE ===\n', allInputs);
  }
});

test('DOM: Customer Inquiry List page', async ({ page }) => {
  await loginToShurgard(page);
  await selectLocation(page);

  // Search for customer
  await navigateToCustomerSearch(page);
  const fnameVisible = await page.locator("xpath=//input[@name='fname']").isVisible().catch(() => false);
  if (fnameVisible) {
    await page.locator("xpath=//input[@name='fname']").fill('Harsh');
    const ctVisible = await page.locator("xpath=//select[@name='selectCustomerType']").isVisible().catch(() => false);
    if (ctVisible) await page.locator("xpath=//select[@name='selectCustomerType']").selectOption('0');
    await page.locator(
      "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'search')]"
    ).filter({ visible: true }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

    const resultLink = page.locator("xpath=//a[contains(normalize-space(text()),'Harsh Joshi')]")
      .filter({ visible: true }).first();
    const found = await resultLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (found) {
      await resultLink.click();
      await page.waitForURL('**/customer-management/customer-information/**', {
        waitUntil: 'domcontentloaded', timeout: 80000,
      });
    }
  }

  // Extract customer ID and navigate to inquiry list
  const url = page.url();
  const match = url.match(/customer-information\/(\d+)/);
  const customerId = match?.[1];
  console.log('\n=== CUSTOMER ID from URL ===\n', customerId);

  if (customerId) {
    await page.goto(`/customer-management/customer-inquiry-list/${customerId}`, {
      waitUntil: 'domcontentloaded', timeout: 80000,
    });
    await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

    const inquiryListHtml = await page.evaluate(() => {
      return document.body.innerHTML.substring(0, 4000);
    });
    console.log('\n=== INQUIRY LIST PAGE HTML ===\n', inquiryListHtml);

    const inquiryLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).filter(a =>
        a.textContent?.toLowerCase().includes('inquiry')
      ).map(a => a.outerHTML).join('\n')
    );
    console.log('\n=== INQUIRY LINKS ===\n', inquiryLinks);
  }
});

test('DOM: Customer Inquiry Detail form', async ({ page }) => {
  await loginToShurgard(page);
  await selectLocation(page);
  await navigateToCustomerSearch(page);

  // Navigate all the way to the inquiry detail form
  const fnameVisible = await page.locator("xpath=//input[@name='fname']").isVisible().catch(() => false);
  if (fnameVisible) {
    await page.locator("xpath=//input[@name='fname']").fill('Harsh');
    const ctVisible = await page.locator("xpath=//select[@name='selectCustomerType']").isVisible().catch(() => false);
    if (ctVisible) await page.locator("xpath=//select[@name='selectCustomerType']").selectOption('0');
    await page.locator(
      "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'search')]"
    ).filter({ visible: true }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

    const resultLink = page.locator("xpath=//a[contains(normalize-space(text()),'Harsh Joshi')]")
      .filter({ visible: true }).first();
    const found = await resultLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (found) {
      await resultLink.click();
      await page.waitForURL('**/customer-management/customer-information/**', {
        waitUntil: 'domcontentloaded', timeout: 80000,
      });
    }
  }

  const url = page.url();
  const match = url.match(/customer-information\/(\d+)/);
  const customerId = match?.[1];
  console.log('\n=== CUSTOMER ID ===', customerId);

  if (customerId) {
    await page.goto(`/customer-management/customer-inquiry-list/${customerId}`, {
      waitUntil: 'domcontentloaded', timeout: 80000,
    });
    await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

    // Click Inquiry 1
    const inquiry1 = page.locator("xpath=//a[contains(normalize-space(text()),'Inquiry 1')]")
      .filter({ visible: true }).first();
    const inquiryFound = await inquiry1.isVisible({ timeout: 10000 }).catch(() => false);
    if (inquiryFound) {
      await inquiry1.click();
      await page.waitForLoadState('networkidle', { timeout: 80000 }).catch(() => {});

      // Extract the entire form
      const formHtml = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        if (forms.length) return Array.from(forms).map(f => f.outerHTML).join('\n---\n').substring(0, 5000);
        return 'No form found — all inputs/selects:\n' +
          Array.from(document.querySelectorAll('input, select, textarea, button'))
            .map(el => el.outerHTML).join('\n');
      });
      console.log('\n=== INQUIRY DETAIL FORM ===\n', formHtml);

      // Check each expected element
      const checks = await page.evaluate(() => ({
        needDate:             document.querySelector("input[name='NeedDate']")?.outerHTML ?? 'NOT FOUND',
        inquiryWhySelect:     document.querySelector("select#inquiryWhy")?.outerHTML ?? 'NOT FOUND',
        inquiryWhyInput:      document.querySelector("input#inquiry-why, input[id='inquiry-why']")?.outerHTML ?? 'NOT FOUND',
        editWhatTextarea:     document.querySelector("textarea[name='editWhat']")?.outerHTML ?? 'NOT FOUND',
        objectionSelect:      document.querySelector("select#inquiryObjection")?.outerHTML ?? 'NOT FOUND',
        objectionInput:       document.querySelector("input#inquiry-Objection, input[id='inquiry-Objection']")?.outerHTML ?? 'NOT FOUND',
        ocObjectionSelect:    document.querySelector("select#inquiryOCObjection")?.outerHTML ?? 'NOT FOUND',
        ocObjectionInput:     document.querySelector("input#inquiry-OCObjection, input[id='inquiry-OCObjection']")?.outerHTML ?? 'NOT FOUND',
        saveButton:           document.querySelector("button[type='submit']")?.outerHTML ??
                              Array.from(document.querySelectorAll('button')).find(b => /save/i.test(b.textContent ?? ''))?.outerHTML ?? 'NOT FOUND',
      }));
      console.log('\n=== ELEMENT CHECKS ===\n', JSON.stringify(checks, null, 2));

      // Log all selects with their options
      const allSelects = await page.evaluate(() =>
        Array.from(document.querySelectorAll('select')).map(sel => ({
          id:      sel.id,
          name:    sel.name,
          options: Array.from(sel.options).map(o => `${o.value}: ${o.text}`),
        }))
      );
      console.log('\n=== ALL SELECT OPTIONS ===\n', JSON.stringify(allSelects, null, 2));
    } else {
      console.log('\n⚠️  "Inquiry 1" link NOT found on inquiry list page');
      const allLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a')).map(a => a.outerHTML).join('\n')
      );
      console.log('\n=== ALL LINKS ===\n', allLinks);
    }
  }
});
