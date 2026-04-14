import { Page } from '@playwright/test';
import { prepareSite, smartFill, smartClick, smartCheck } from '../../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert } from '../../helpers/kendo';

export interface TC001Data {
  startUrl: string;
  credentials: { username: string; password: string };
  formName: string;
  endDate?: string;
  emailTemplateParent?: string;
  emailTemplateSchool?: string;
  submittedDateField?: string;
  submittedTimeField?: string;
  paymentDateField?: string;
  transactionIdField?: string;
  amountPaidField?: string;
  depositAmount?: string;
  baseAmount?: string;
}

export async function executeTC001(page: Page, data: TC001Data) {
  // ── Object Repository (from monolithic script) ──
  const L = {
    emailInput          : page.locator('xpath=//*[@id=\'txtUserName\']').filter({ visible: true }).first(),
    passwordInput       : page.locator('xpath=//*[@id=\'txtUserPassword\']').filter({ visible: true }).first(),
    loginButton         : page.locator('xpath=//*[@id=\'btnLoginUser\']').filter({ visible: true }).first(),
    addNewFormButton    : page.locator('xpath=//*[@id=\'btnNewForm\']').filter({ visible: true }).first(),
    nextButton          : page.locator('xpath=//*[@id=\'btnSelectFormCreationNext\']').filter({ visible: true }).first(),
    formnameInput       : page.locator('xpath=//*[@id=\'FormName\']').filter({ visible: true }).first(),
    formstatusRadio     : page.locator('xpath=//*[@id=\'dateRange\']').filter({ visible: true }).first(),
    feeenabledCheckbox  : page.locator('xpath=//*[@id=\'FeeEnabled\']').filter({ visible: true }).first(),
    paymentplanenabledCheckbox: page.locator('xpath=//*[@id=\'PaymentPlanEnabled\']').filter({ visible: true }).first(),
    deposittypeRadio    : page.locator('xpath=//*[@id=\'rdoPercentageDeposit\']').filter({ visible: true }).first(),
    depositamountInput  : page.locator('xpath=//*[@id=\'DepositAmount\']').filter({ visible: true }).first(),
    amountInput         : page.locator('xpath=//*[@id=\'Amount\']').filter({ visible: true }).first(),
    saveButton          : page.locator('xpath=//*[@id=\'btnSaveOnlineForms\']').filter({ visible: true }).first(),
    doneButton          : page.locator('xpath=//*[@id=\'okButton\']').filter({ visible: true }).first(),
  };

  // ── Step 1: Navigate and login ──
  await page.goto(data.startUrl);
  await prepareSite(page);
  await page.waitForURL('**/Admin/AdminLogin**', { waitUntil: 'domcontentloaded' });
  await smartFill(L.emailInput, data.credentials.username);
  await smartFill(L.passwordInput, data.credentials.password);
  await smartClick(L.loginButton);
  await page.waitForURL('**/FormsManager/CreateEditForms', { waitUntil: 'domcontentloaded' });

  // ── Step 2: Create new form ──
  await smartClick(L.addNewFormButton);
  await smartClick(L.nextButton);
  await page.waitForURL('**/FormsManager/FormSettings', { waitUntil: 'domcontentloaded' });

  // ── Step 3: Fill form settings ──
  await smartFill(L.formnameInput, data.formName);

  // Date range
  await smartClick(L.formstatusRadio);
  await smartCheck(L.formstatusRadio);
  if (data.endDate) {
    await page.waitForTimeout(2000);
    await selectKendoDate(page, 'formEndDate', data.endDate);
  }

  // Email templates
  if (data.emailTemplateParent) await selectKendoDropdown(page, 'ddlFormSubmittedParent', data.emailTemplateParent);
  if (data.emailTemplateSchool) await selectKendoDropdown(page, 'ddlFormSubmittedSchool', data.emailTemplateSchool);

  // Submitted fields
  if (data.submittedDateField) await selectKendoDropdown(page, 'ddlSubmittedDate', data.submittedDateField);
  if (data.submittedTimeField) await selectKendoDropdown(page, 'ddlSubmittedTime', data.submittedTimeField);

  // Fee payment
  await smartCheck(L.feeenabledCheckbox);
  if (data.paymentDateField) await selectKendoDropdown(page, 'ddlPaymentDate', data.paymentDateField);
  if (data.transactionIdField) await selectKendoDropdown(page, 'ddlTransactionId', data.transactionIdField);
  if (data.amountPaidField) await selectKendoDropdown(page, 'ddlAmountPaid', data.amountPaidField);

  // Payment plan
  await smartCheck(L.paymentplanenabledCheckbox);
  await smartClick(L.deposittypeRadio);
  await smartCheck(L.deposittypeRadio);
  if (data.depositAmount) await smartFill(L.depositamountInput, data.depositAmount);

  // Save (may trigger validation popup)
  await smartClick(L.saveButton);
  // Dismiss "Please enter Start Date" or similar warning
  await smartClick(L.doneButton).catch(() => {});
  await page.waitForTimeout(500);

  // Fill base amount and save again
  if (data.baseAmount) await smartFill(L.amountInput, data.baseAmount);
  await smartClick(L.saveButton);
  await waitAndDismissAnyKendoAlert(page);
}
