import { Page } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { CreateEditFormsPage } from '../pages/CreateEditFormsPage';
import { FormSettingsPage } from '../pages/FormSettingsPage';
import { prepareSite } from '../helpers/universal';

export interface WorkflowData {
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

export async function executeWorkflow(page: Page, data: WorkflowData) {
  // Navigate and prepare
  await page.goto(data.startUrl);
  await prepareSite(page);

  // Step 1: Login
  const loginPage = new AdminLoginPage(page);
  await loginPage.login(data.credentials.username, data.credentials.password);

  // Step 2: Create new form
  const formsPage = new CreateEditFormsPage(page);
  await formsPage.clickAddNewForm();
  await formsPage.clickNext();

  // Step 3: Fill form settings
  const settingsPage = new FormSettingsPage(page);
  await settingsPage.fillFormName(data.formName);

  // Step 4: Date range (optional)
  if (data.enableDateRange && data.fromDate) {
    await settingsPage.enableDateRange();
    await settingsPage.setFromDate(data.fromDate);
    if (data.toDate) await settingsPage.setToDate(data.toDate);
  }

  // Step 5: Email templates (optional)
  if (data.emailTemplateParent) {
    await settingsPage.selectEmailTemplateParent(data.emailTemplateParent);
  }
  if (data.emailTemplateSchool) {
    await settingsPage.selectEmailTemplateSchool(data.emailTemplateSchool);
  }

  // Step 6: Submitted date/time fields (optional)
  if (data.submittedDateField) {
    await settingsPage.selectSubmittedDateField(data.submittedDateField);
  }
  if (data.submittedTimeField) {
    await settingsPage.selectSubmittedTimeField(data.submittedTimeField);
  }

  // Step 7: Fee payment (optional)
  if (data.feeEnabled) {
    await settingsPage.enableFeePayment();
    if (data.baseAmount) await settingsPage.setBaseAmount(data.baseAmount);
    await settingsPage.selectFixedFeeType();
    if (data.transactionFee) await settingsPage.setTransactionFee(data.transactionFee);
    if (data.perTransactionFee) await settingsPage.setPerTransactionFee(data.perTransactionFee);
  }

  // Step 8: Payment plan (optional)
  if (data.paymentPlanEnabled && data.paymentPlanName) {
    await settingsPage.enablePaymentPlan();
    await settingsPage.createPaymentPlan(
      data.paymentPlanName,
      data.numberOfPayments || '3',
      data.daysForPayment || '4'
    );
  }

  // Step 9: Save
  await settingsPage.save();
}
