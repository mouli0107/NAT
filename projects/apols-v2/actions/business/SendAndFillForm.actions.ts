import { Page } from '@playwright/test';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { prepareSite, smartFill, smartClick, smartCheck } from '../../helpers/universal';
import { selectKendoDropdown, waitAndDismissAnyKendoAlert } from '../../helpers/kendo';
import { extractLinksFromEmail } from '../../helpers/email';

export interface SendAndFillFormData {
  startUrl: string;
  credentials: { username: string; password: string };
  formName: string;
  recipientEmail: string;
  // Email extraction config
  emailSubject?: string;
  emailLinkDomain?: string;
  emailWaitSeconds?: number;
  // Form fill data (the parent fills this)
  parentFirstName?: string;
  parentLastName?: string;
  parentPhone?: string;
  // Payment data
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
}

export async function executeSendAndFillForm(page: Page, data: SendAndFillFormData) {
  // ════════════════════════════════════════════════════════════════════════
  // PHASE 1: Admin sends the form to recipient
  // (Record this part in APOLF admin → select recipient → send)
  // ════════════════════════════════════════════════════════════════════════

  await page.goto(data.startUrl);
  await prepareSite(page);

  // Login as admin
  const loginPage = new AdminLoginPage(page);
  await loginPage.login(data.credentials.username, data.credentials.password);

  // Navigate to the form and click Send
  // (These steps come from recording — add your recorded locators here)
  await smartClick(page.locator('#btnSend, button:has-text("Send")').first());
  await page.waitForURL('**/FormsManager/SendGenericForm', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click Add Recipients
  await page.locator('#btnLoadRecipients').click();
  await page.waitForTimeout(3000);

  // Filter by recipient name and select
  await page.evaluate((email) => {
    var $ = (window as any).jQuery;
    var grid = $('#GridStudentDetails').data('kendoGrid');
    if (grid) {
      grid.dataSource.filter({ field: 'StudentName', operator: 'contains', value: email });
    }
  }, data.recipientEmail);
  await page.waitForTimeout(2000);

  // Select all filtered results
  await page.evaluate(() => {
    var $ = (window as any).jQuery;
    var checkboxes = $('#GridStudentDetails tbody input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      if (!$(checkboxes[i]).is(':checked')) $(checkboxes[i]).click();
    }
  });
  await page.waitForTimeout(1000);

  // Select "All" contacts and Publish
  await page.locator('#rdoAll').check({ force: true }).catch(async () => {
    await page.evaluate(() => {
      var el = document.getElementById('rdoAll');
      if (el) (el as HTMLInputElement).click();
    });
  });
  await page.waitForTimeout(500);

  // Record the timestamp BEFORE sending email
  const emailSentAt = new Date();

  await smartClick(page.locator('#btnPublish'));
  await waitAndDismissAnyKendoAlert(page);
  await page.waitForTimeout(3000);

  console.log('[Test] Form published. Waiting for email to arrive...');

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 2: Extract the form link from Gmail
  // (No recording needed — email helper does this automatically)
  // ════════════════════════════════════════════════════════════════════════

  const emailResult = await extractLinksFromEmail({
    subject: data.emailSubject || 'Fill',
    receivedAfter: emailSentAt,
    waitSeconds: data.emailWaitSeconds || 120,
    pollIntervalSeconds: 10,
    linkDomain: data.emailLinkDomain || 'apolf-web-preprod.azurewebsites.net',
    pickStrategy: 'first',
  });

  console.log('[Test] Email received! Link:', emailResult.primaryLink);
  console.log('[Test] Subject:', emailResult.subject);

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3: Open the form link and fill it as parent
  // (Record this part on the parent form page)
  // ════════════════════════════════════════════════════════════════════════

  await page.goto(emailResult.primaryLink);
  await prepareSite(page);
  await page.waitForTimeout(3000);

  // Fill the form fields
  // (Add your specific form field locators from recording here)
  if (data.parentFirstName) {
    await smartFill(page.locator('input[name="firstName"], #firstName').first(), data.parentFirstName);
  }
  if (data.parentLastName) {
    await smartFill(page.locator('input[name="lastName"], #lastName').first(), data.parentLastName);
  }
  if (data.parentPhone) {
    await smartFill(page.locator('input[name="phone"], #phone').first(), data.parentPhone);
  }

  // Click Submit and Pay
  await smartClick(page.locator('button:has-text("Submit"), button:has-text("Submit and Pay"), #btnSubmit').first());
  await page.waitForTimeout(3000);

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 4: Enter payment details
  // (This may be an iframe or redirect to a payment gateway)
  // ════════════════════════════════════════════════════════════════════════

  // Check if payment is in an iframe
  const paymentFrame = page.frameLocator('iframe[src*="pay"], iframe[src*="stripe"], iframe[src*="checkout"]').first();

  if (data.cardNumber) {
    // Try iframe first, fall back to main page
    try {
      await paymentFrame.locator('input[name="cardnumber"], input[placeholder*="Card number"]').first()
        .fill(data.cardNumber, { timeout: 5000 });
      if (data.cardExpiry) {
        await paymentFrame.locator('input[name="exp-date"], input[placeholder*="MM"]').first()
          .fill(data.cardExpiry);
      }
      if (data.cardCVV) {
        await paymentFrame.locator('input[name="cvc"], input[placeholder*="CVC"]').first()
          .fill(data.cardCVV);
      }
    } catch {
      // Not in iframe — try main page
      await smartFill(page.locator('input[name="cardnumber"], #cardNumber').first(), data.cardNumber);
      if (data.cardExpiry) await smartFill(page.locator('input[name="exp-date"], #expiry').first(), data.cardExpiry);
      if (data.cardCVV) await smartFill(page.locator('input[name="cvc"], #cvv').first(), data.cardCVV);
    }

    // Click Pay button
    await smartClick(page.locator('button:has-text("Pay"), button[type="submit"]:has-text("Pay"), #btnPay').first());
    await page.waitForTimeout(5000);
  }

  console.log('[Test] Form submitted and payment completed.');
}
