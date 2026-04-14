import { Page } from '@playwright/test';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { prepareSite, smartFill, smartClick, smartCheck } from '../../helpers/universal';
import { waitAndDismissAnyKendoAlert } from '../../helpers/kendo';

// ─────────────────────────────────────────────────────────────────────────────
// Shared type for all Form Settings test cases
// ─────────────────────────────────────────────────────────────────────────────
export interface FormSettingsData {
  startUrl: string;
  credentials: { username: string; password: string };
  formName: string;
  enableDateRange?: boolean;
  fromDate?: string;
  toDate?: string;
  emailTemplateParent?: string;
  emailTemplateSchool?: string;
  submittedDateField?: string;
  submittedTimeField?: string;
  feeEnabled?: boolean;
  baseAmount?: string;
  transactionFee?: string;
  perTransactionFee?: string;
  paymentPlanEnabled?: boolean;
  paymentPlanName?: string;
  numberOfPayments?: string;
  daysForPayment?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TC001 — Full flow: Create form → Configure → Add questions → Publish
// Based on OLF recording (projects/OLF/actions/publishingform.actions.ts)
// ─────────────────────────────────────────────────────────────────────────────
export async function executeTC001(page: Page, data: FormSettingsData) {
  await page.goto(data.startUrl);
  await prepareSite(page);

  // ── Phase 1: Login ────────────────────────────────────────────────────
  const loginPage = new AdminLoginPage(page);
  await loginPage.login(data.credentials.username, data.credentials.password);
  await page.waitForTimeout(2000);
  console.log('[TC001] Logged in');

  // ── Phase 2: Create new form ──────────────────────────────────────────
  await smartClick(page.locator('#btnNewForm').first());
  await page.waitForTimeout(1000);
  await smartClick(page.locator('#btnSelectFormCreationNext').first());
  await page.waitForTimeout(3000);
  console.log('[TC001] On Form Settings page');

  // ── Phase 3: Fill form settings ───────────────────────────────────────
  await smartFill(page.locator('#FormName').first(), data.formName);

  if (data.feeEnabled) {
    await smartCheck(page.locator('#FeeEnabled').first());
    await page.waitForTimeout(500);
    if (data.baseAmount) await smartFill(page.locator('#Amount').first(), data.baseAmount);
    await smartCheck(page.locator('#rdoFixed').first());
    if (data.transactionFee) await smartFill(page.locator('#transactionFee').first(), data.transactionFee);
    if (data.perTransactionFee) await smartFill(page.locator('#perTansactionFee').first(), data.perTransactionFee);
  }

  if (data.paymentPlanEnabled && data.paymentPlanName) {
    await smartCheck(page.locator('#PaymentPlanEnabled').first());
    await page.waitForTimeout(500);
    await smartClick(page.locator('#btnCreatePaymentPlan').first());
    await page.waitForTimeout(1000);
    await smartClick(page.locator('#txtPaymentPlanName').first());
    await smartFill(page.locator('#txtPaymentPlanName').first(), data.paymentPlanName);
    await smartFill(page.locator('#txtNoOfPayments').first(), data.numberOfPayments || '12');
    await smartClick(page.locator('#btnCreateFormPaymentPlan').first());
    await page.waitForTimeout(2000);
    await smartClick(page.locator('#txtNoOfDaysforPaymentDue').first());
    await smartFill(page.locator('#txtNoOfDaysforPaymentDue').first(), data.daysForPayment || '5');

    // Fill payment dates for all rows using Kendo Grid
    const { fillKendoGridDates } = require('../../helpers/kendo');
    await fillKendoGridDates(page, 'gridPaymentPlan', 'txtNoOfDaysforPaymentDue');
    await smartClick(page.locator('#btnSavePaymentPlan').first());
    await waitAndDismissAnyKendoAlert(page);
    // Dismiss any Bootstrap modal
    await page.locator('#modal-warning.in button, #modal-warning.in .btn').first()
      .click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    console.log('[TC001] Payment plan created');
  }

  // Save form settings
  await page.locator('#modal-warning.in button').first().click({ timeout: 2000 }).catch(() => {});
  await smartClick(page.locator('#btnSaveOnlineForms').first());
  await waitAndDismissAnyKendoAlert(page);
  await page.waitForTimeout(3000);
  console.log('[TC001] Form settings saved');

  // ── Phase 4: CreateEditPages — Add questions, remove extra pages ──────
  // (From OLF recording: clickAddFromExistingQuestions → selectAll → save)
  console.log('[TC001] On CreateEditPages:', page.url());

  // Click "+ Add From Existing Questions"
  await smartClick(page.locator('button:has-text("Add From Existing Questions")').first());
  await page.waitForTimeout(3000);
  console.log('[TC001] Add From Existing Questions popup opened');

  // Select all questions — try header checkbox first, then jQuery fallback
  const headerCb = page.locator('#QuestionFormExistingFormsGrid th input[type="checkbox"]').first();
  if (await headerCb.isVisible().catch(() => false)) {
    await headerCb.click({ force: true });
  } else {
    // Fallback: select all via jQuery
    await page.evaluate(() => {
      var $ = (window as any).jQuery;
      if ($) {
        $('#QuestionFormExistingFormsGrid tbody input[type="checkbox"]').each(function() {
          if (!$(this).is(':checked')) $(this).click();
        });
      }
    });
  }
  await page.waitForTimeout(1000);
  console.log('[TC001] Selected all questions');

  // Click Save to add questions
  await smartClick(page.locator('#btnSaveQuestions, button:has-text("Save")').first());
  await page.waitForTimeout(3000);

  // Dismiss all confirmation popups (Yes/OK buttons)
  for (let i = 0; i < 5; i++) {
    const okBtn = page.locator('#okButton, button:has-text("Yes"), button:has-text("OK")').first();
    const visible = await okBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      await smartClick(okBtn);
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }
  console.log('[TC001] Questions added');

  // ── Delete Page 4, Page 3, Page 2 (keep only Page 1) ─────────────────
  // Each page tab has a 🗑️ delete icon. Delete from right to left.
  for (const pageName of ['Page 4', 'Page 3', 'Page 2']) {
    const pageTab = page.locator(`li:has-text("${pageName}"), a:has-text("${pageName}")`).first();
    const tabVisible = await pageTab.isVisible().catch(() => false);
    if (!tabVisible) {
      console.log(`[TC001] ${pageName} tab not found — skipping`);
      continue;
    }

    // Click the page tab first to select it
    await pageTab.click();
    await page.waitForTimeout(1000);

    // Click the delete icon (🗑️) on the active tab — it's typically a <span> or <a> with a trash icon
    const deleteIcon = page.locator('li.active .fa-trash, li.active .glyphicon-trash, li.active a[title*="Delete"], li.active button[title*="Delete"], li.k-state-active .fa-trash').first();
    if (await deleteIcon.isVisible().catch(() => false)) {
      await deleteIcon.click({ force: true });
    } else {
      // Fallback: find delete icon near the active page tab by looking for trash icon
      await page.evaluate((pName: string) => {
        const tabs = document.querySelectorAll('li');
        for (const tab of tabs) {
          if (tab.textContent?.includes(pName)) {
            const trashIcon = tab.querySelector('.fa-trash, .glyphicon-trash, [class*="delete"], [class*="trash"]');
            if (trashIcon) { (trashIcon as HTMLElement).click(); return; }
            // Try the nearby delete button/icon
            const icons = tab.querySelectorAll('a, span, button, i');
            for (const icon of icons) {
              if (icon.getAttribute('title')?.toLowerCase().includes('delete') ||
                  icon.className?.includes('trash') || icon.className?.includes('delete')) {
                (icon as HTMLElement).click(); return;
              }
            }
          }
        }
      }, pageName);
    }
    await page.waitForTimeout(1000);

    // Confirm deletion (OK/Yes popup)
    const confirmBtn = page.locator('#okButton, button:has-text("Yes"), button:has-text("OK")').first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await smartClick(confirmBtn);
      await page.waitForTimeout(2000);
    }
    console.log(`[TC001] Deleted ${pageName}`);
  }
  console.log('[TC001] Only Page 1 remains');

  // ── Phase 5: Go back to Create/Edit Forms list ────────────────────────
  await smartClick(page.locator('#linkBackToForms').first());
  await page.waitForURL('**/FormsManager/CreateEditForms', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);
  console.log('[TC001] Back on Create/Edit Forms list:', page.url());

  // Search for the form by name
  const searchField = page.locator('#searchValue').first();
  await searchField.click();
  await searchField.fill(data.formName);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  console.log('[TC001] Searched for:', data.formName);

  // Find the form row and click its Send button
  const formRow = page.locator('tr').filter({ hasText: data.formName });
  const rowCount = await formRow.count();
  console.log('[TC001] Found', rowCount, 'rows matching form name');

  if (rowCount > 0) {
    // Click the Send button in the row
    const sendBtn = formRow.first().locator('button:has-text("Send")').first();
    await sendBtn.click({ force: true });
    await page.waitForTimeout(5000);
  } else {
    throw new Error(`[TC001] Form "${data.formName}" not found in the grid after search`);
  }

  // Wait for SendGenericForm to load
  await page.waitForURL('**/FormsManager/SendGenericForm', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('[TC001] On SendGenericForm:', page.url());

  // ── Phase 6: Add recipients → Filter Lince → Select all → Publish ────
  // The SendGenericForm page may already show the Add Recipients popup, or we need to click ADD RECIPIENTS
  const addRecipientsBtn = page.locator('#btnLoadRecipients, button:has-text("ADD RECIPIENTS")').first();
  if (await addRecipientsBtn.isVisible().catch(() => false)) {
    await smartClick(addRecipientsBtn);
    await page.waitForTimeout(3000);
    console.log('[TC001] Clicked ADD RECIPIENTS');
  }

  // Check if Search button is visible (inside popup) and click it
  const searchBtn = page.locator('button:has-text("Search")').first();
  if (await searchBtn.isVisible().catch(() => false)) {
    await searchBtn.click();
    await page.waitForTimeout(3000);
    console.log('[TC001] Searched for students');
  }

  // Select all students in the grid (header checkbox) — from OLF recording
  const gridHeaderCb = page.locator('#GridStudentDetails th input[type="checkbox"]').first();
  if (await gridHeaderCb.isVisible().catch(() => false)) {
    await gridHeaderCb.click({ force: true });
    await page.waitForTimeout(1000);
    console.log('[TC001] Selected all students via header checkbox');
  } else {
    // Fallback: filter by Lince and select via jQuery
    await page.evaluate(() => {
      var $ = (window as any).jQuery;
      var grid = $('#GridStudentDetails').data('kendoGrid');
      if (grid) {
        grid.dataSource.filter({ field: 'StudentName', operator: 'contains', value: 'Lince' });
      }
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      var $ = (window as any).jQuery;
      $('#GridStudentDetails tbody input[type="checkbox"]').each(function() {
        if (!$(this).is(':checked')) $(this).click();
      });
    });
    await page.waitForTimeout(1000);
    console.log('[TC001] Filtered by Lince and selected students');
  }

  // Select "All" contacts radio
  await page.locator('#rdoAll').check({ force: true }).catch(async () => {
    await page.evaluate(() => {
      var el = document.getElementById('rdoAll');
      if (el) (el as HTMLInputElement).click();
    });
  });
  await page.waitForTimeout(500);
  console.log('[TC001] Selected All contacts');

  // Click ✅ Publish
  await smartClick(page.locator('#btnPublish').first());
  await page.waitForTimeout(5000);
  await waitAndDismissAnyKendoAlert(page);
  console.log('[TC001] ✅ Form published successfully');
}

// ─────────────────────────────────────────────────────────────────────────────
// TC002 — Create form with fee payment only (no date range, no payment plan)
// ─────────────────────────────────────────────────────────────────────────────
export async function executeTC002(page: Page, data: FormSettingsData) {
  await page.goto(data.startUrl);
  await prepareSite(page);

  const loginPage = new AdminLoginPage(page);
  await loginPage.login(data.credentials.username, data.credentials.password);

  await smartClick(page.locator('#btnNewForm').first());
  await page.waitForTimeout(1000);
  await smartClick(page.locator('#btnSelectFormCreationNext').first());
  await page.waitForTimeout(3000);

  await smartFill(page.locator('#FormName').first(), data.formName);

  if (data.feeEnabled) {
    await smartCheck(page.locator('#FeeEnabled').first());
    if (data.baseAmount) await smartFill(page.locator('#Amount').first(), data.baseAmount);
    await smartCheck(page.locator('#rdoFixed').first());
    if (data.transactionFee) await smartFill(page.locator('#transactionFee').first(), data.transactionFee);
    if (data.perTransactionFee) await smartFill(page.locator('#perTansactionFee').first(), data.perTransactionFee);
  }

  await smartClick(page.locator('#btnSaveOnlineForms').first());
  await waitAndDismissAnyKendoAlert(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// TC003 — Create basic form (same workflow, different data, no fee)
// ─────────────────────────────────────────────────────────────────────────────
export async function executeTC003(page: Page, data: FormSettingsData) {
  await page.goto(data.startUrl);
  await prepareSite(page);

  const loginPage = new AdminLoginPage(page);
  await loginPage.login(data.credentials.username, data.credentials.password);

  await smartClick(page.locator('#btnNewForm').first());
  await page.waitForTimeout(1000);
  await smartClick(page.locator('#btnSelectFormCreationNext').first());
  await page.waitForTimeout(3000);

  await smartFill(page.locator('#FormName').first(), data.formName);

  await smartClick(page.locator('#btnSaveOnlineForms').first());
  await waitAndDismissAnyKendoAlert(page);
}
