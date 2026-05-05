import { Page } from '@playwright/test';
import { LoadFormPage } from '../pages/LoadFormPage';
import { PaymentPlanPage } from '../pages/PaymentPlanPage';
import { PaymentCardDetailsPage } from '../pages/PaymentCardDetailsPage';
import { prepareSite } from '../helpers/universal';
import { TestDataRow } from '../fixtures/excel-reader';

export async function executeparentlogin1Workflow(
  page: Page,
  data: TestDataRow
): Promise<void> {
  await page.goto(data.startUrl || data.baseUrl);
  await prepareSite(page);

  // ── Step 1: Submit the applicant form ────────────────────────────────────────
  const loadFormPage = new LoadFormPage(page);
  await loadFormPage.fillBtnsubmitapplicantform('Pay And Submit');
  await loadFormPage.clickBtnsubmitapplicantform();

  await page.waitForURL('**/Payment/PaymentPlan', { waitUntil: 'domcontentloaded' });

  // ── Step 2: Select payment plan option ──────────────────────────────────────
  const paymentPlanPage = new PaymentPlanPage(page);
  await paymentPlanPage.clickRdopaymentplanoptions2();
  await paymentPlanPage.enableRdopaymentplanoptions2();
  await paymentPlanPage.clickContinue();

  await page.waitForURL('**/Payment/PaymentCardDetails', { waitUntil: 'domcontentloaded' });

  // ── Step 3: Enter payment card details ───────────────────────────────────────
  const paymentCardDetailsPage = new PaymentCardDetailsPage(page);
  await paymentCardDetailsPage.clickNewPaymentMethod();

  // Card fields — all values come from Excel (fixtures/test-data.xlsx row TC0011)
  await page.waitForTimeout(2000); // wait for Finix iframes to load
  await page.fill('[placeholder="Full Name"]',       data.fullName);
  await page.fill('[placeholder="4111 1111 1111 1111"]', data.cardNumber);
  await page.fill('[placeholder="MM / YY"]',         data.expiryDate);
  await page.fill('[placeholder="CVC"]',             data.cvc);
  await page.fill('[placeholder="Address Line 1"]',  data.addressLine1);
  await page.fill('[placeholder="City"]',            data.city);
  await page.fill('[placeholder="State"]',           data.addressRegion);
  await page.fill('[placeholder="ZIP"]',             data.zip);

  await paymentCardDetailsPage.clickSave();
  await paymentCardDetailsPage.clickCardAccountTypeCardAccountNu();
}
